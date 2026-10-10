import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { UserEntity } from '../auth/user.entity';
import { CheckinTicketEntity } from '../checkin/checkin-ticket.entity';
import { CommerceService } from '../commerce/commerce.service';
import { GroupMembershipEntity } from '../social/group-membership.entity';
import { MembersService } from '../members/members.service';
import { MemberKudoEntity } from './member-kudo.entity';
import {
  KUDO_TYPE_LABELS,
  KUDO_TYPES,
  KudoContextType,
  KudoType,
  MAX_KUDOS_PER_DAY,
  PAIR_TYPE_COOLDOWN_DAYS,
  RECIPROCAL_WINDOW_DAYS,
} from './kudo.types';

export type KudoView = {
  id: string;
  kudoType: KudoType;
  message: string | null;
  status: MemberKudoEntity['status'];
  contextType: KudoContextType | null;
  contextId: string | null;
  contextVerified: boolean;
  createdAt: string;
  approvedAt: string | null;
  giver: { userId: string; slug: string; displayName: string | null };
  recipient: { userId: string; slug: string; displayName: string | null };
};

@Injectable()
export class KudosService {
  constructor(
    @InjectRepository(MemberKudoEntity)
    private readonly kudos: Repository<MemberKudoEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(CheckinTicketEntity)
    private readonly tickets: Repository<CheckinTicketEntity>,
    @InjectRepository(GroupMembershipEntity)
    private readonly groupMembers: Repository<GroupMembershipEntity>,
    private readonly members: MembersService,
    private readonly commerce: CommerceService,
  ) {}

  listTypes() {
    return KUDO_TYPES.map((id) => ({ id, label: KUDO_TYPE_LABELS[id] }));
  }

  async submit(input: {
    giverId: string;
    recipientId: string;
    kudoType: string;
    message?: string | null;
    contextType?: string | null;
    contextId?: string | null;
  }): Promise<MemberKudoEntity> {
    const giverId = input.giverId;
    const recipientId = input.recipientId;
    if (giverId === recipientId) {
      throw new BadRequestException('You cannot give kudos to yourself');
    }
    if (!(KUDO_TYPES as readonly string[]).includes(input.kudoType)) {
      throw new BadRequestException('Invalid kudo type');
    }
    const kudoType = input.kudoType as KudoType;

    await this.assertActiveUser(giverId);
    await this.assertActiveUser(recipientId);
    if (await this.members.isBlockedEitherWay(giverId, recipientId)) {
      throw new ForbiddenException('Cannot send kudos to this member');
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sentToday = await this.kudos.count({
      where: { giverId, createdAt: MoreThan(dayAgo) },
    });
    if (sentToday >= MAX_KUDOS_PER_DAY) {
      throw new BadRequestException('Daily kudos limit reached');
    }

    const cooldownStart = new Date(
      Date.now() - PAIR_TYPE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
    );
    const recentSame = await this.kudos.findOne({
      where: {
        giverId,
        recipientId,
        kudoType,
        status: In(['pending', 'approved']),
        createdAt: MoreThan(cooldownStart),
      },
    });
    if (recentSame) {
      throw new BadRequestException(
        'You already sent this type of kudo to this member recently',
      );
    }

    const reciprocalStart = new Date(
      Date.now() - RECIPROCAL_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );
    const reciprocal = await this.kudos.findOne({
      where: {
        giverId: recipientId,
        recipientId: giverId,
        kudoType,
        status: In(['pending', 'approved']),
        createdAt: MoreThan(reciprocalStart),
      },
    });
    if (reciprocal) {
      throw new BadRequestException(
        'Reciprocal kudos of this type are temporarily limited',
      );
    }

    let contextType: KudoContextType | null = null;
    let contextId: string | null = null;
    let contextVerified = false;
    if (input.contextType && input.contextId) {
      const parsed = this.parseContext(input.contextType, input.contextId);
      contextType = parsed.contextType;
      contextId = parsed.contextId;
      contextVerified = await this.verifyContext(
        giverId,
        recipientId,
        contextType,
        contextId,
      );
    }

    const message = input.message?.trim().slice(0, 280) || null;

    return await this.kudos.save(
      this.kudos.create({
        giverId,
        recipientId,
        kudoType,
        status: 'pending',
        message,
        contextType,
        contextId,
        contextVerified,
      }),
    );
  }

  async approve(
    kudoId: string,
    recipientId: string,
  ): Promise<MemberKudoEntity> {
    const row = await this.kudos.findOne({ where: { id: kudoId } });
    if (!row) throw new NotFoundException('Kudo not found');
    if (row.recipientId !== recipientId) {
      throw new ForbiddenException('Only the recipient can approve');
    }
    if (row.status !== 'pending') {
      throw new BadRequestException('Kudo is not pending approval');
    }
    row.status = 'approved';
    row.approvedAt = new Date();
    return await this.kudos.save(row);
  }

  async hide(kudoId: string, actorId: string): Promise<MemberKudoEntity> {
    const row = await this.kudos.findOne({ where: { id: kudoId } });
    if (!row) throw new NotFoundException('Kudo not found');
    if (row.giverId === actorId) {
      row.status = 'hidden_by_giver';
    } else if (row.recipientId === actorId) {
      row.status = 'hidden_by_recipient';
    } else {
      throw new ForbiddenException('Not allowed to hide this kudo');
    }
    return await this.kudos.save(row);
  }

  async suppress(kudoId: string): Promise<MemberKudoEntity> {
    const row = await this.kudos.findOne({ where: { id: kudoId } });
    if (!row) throw new NotFoundException('Kudo not found');
    row.status = 'suppressed';
    return await this.kudos.save(row);
  }

  async listPendingForRecipient(recipientId: string): Promise<KudoView[]> {
    const rows = await this.kudos.find({
      where: { recipientId, status: 'pending' },
      order: { createdAt: 'DESC' },
    });
    return await this.toViews(rows, recipientId);
  }

  async listGivenBy(giverId: string): Promise<KudoView[]> {
    const rows = await this.kudos.find({
      where: { giverId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return await this.toViews(rows, giverId);
  }

  async listApprovedForProfile(
    profileKey: string,
    viewerId: string | null,
  ): Promise<KudoView[]> {
    const profile = await this.members.resolveProfileKey(profileKey);
    if (!profile) throw new NotFoundException('Member not found');
    const recipientId = profile.userId;
    await this.members.getPublicProfile(profileKey, viewerId);

    const rows = await this.kudos.find({
      where: { recipientId, status: 'approved' },
      order: { approvedAt: 'DESC', createdAt: 'DESC' },
      take: 24,
    });
    const visible: MemberKudoEntity[] = [];
    for (const row of rows) {
      const giver = await this.users.findOne({ where: { id: row.giverId } });
      if (!giver || giver.accountStatus === 'suspended') continue;
      visible.push(row);
    }
    return await this.toViews(visible, viewerId);
  }

  private async assertActiveUser(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || user.accountStatus === 'suspended') {
      throw new NotFoundException('Member not found');
    }
  }

  private parseContext(
    contextType: string,
    contextId: string,
  ): { contextType: KudoContextType; contextId: string } {
    const id = contextId.trim();
    if (!id) throw new BadRequestException('Invalid context');
    if (
      contextType === 'event' ||
      contextType === 'course' ||
      contextType === 'group'
    ) {
      return { contextType, contextId: id };
    }
    throw new BadRequestException('Invalid context type');
  }

  private async verifyContext(
    giverId: string,
    recipientId: string,
    contextType: KudoContextType,
    contextId: string,
  ): Promise<boolean> {
    if (contextType === 'event') {
      const giverTicket = await this.tickets.findOne({
        where: { eventId: contextId, userSub: giverId },
      });
      const recipientTicket = await this.tickets.findOne({
        where: { eventId: contextId, userSub: recipientId },
      });
      return Boolean(giverTicket && recipientTicket);
    }
    if (contextType === 'course') {
      const giverEnt = await this.commerce.hasActiveEntitlement(
        giverId,
        'course_access',
        contextId,
      );
      const recipientEnt = await this.commerce.hasActiveEntitlement(
        recipientId,
        'course_access',
        contextId,
      );
      return giverEnt && recipientEnt;
    }
    if (contextType === 'group') {
      const giverMem = await this.groupMembers.findOne({
        where: { groupId: contextId, userId: giverId },
      });
      const recipientMem = await this.groupMembers.findOne({
        where: { groupId: contextId, userId: recipientId },
      });
      return Boolean(giverMem && recipientMem);
    }
    return false;
  }

  private async toViews(
    rows: MemberKudoEntity[],
    viewerId: string | null,
  ): Promise<KudoView[]> {
    const out: KudoView[] = [];
    for (const row of rows) {
      out.push(await this.toView(row, viewerId));
    }
    return out;
  }

  private async toView(
    row: MemberKudoEntity,
    viewerId: string | null,
  ): Promise<KudoView> {
    const giverProfile = await this.members.ensureProfileForUser(row.giverId);
    const recipientProfile = await this.members.ensureProfileForUser(
      row.recipientId,
    );
    const giverUser = await this.users.findOne({ where: { id: row.giverId } });
    const recipientUser = await this.users.findOne({
      where: { id: row.recipientId },
    });
    const giverName =
      giverProfile.displayName?.trim() ||
      giverUser?.name?.trim() ||
      giverUser?.email?.split('@')[0] ||
      'Member';
    const recipientName =
      recipientProfile.displayName?.trim() ||
      recipientUser?.name?.trim() ||
      recipientUser?.email?.split('@')[0] ||
      'Member';

    const isParty = viewerId === row.giverId || viewerId === row.recipientId;
    const showStatus = isParty;

    return {
      id: row.id,
      kudoType: row.kudoType,
      message: row.message,
      status: showStatus ? row.status : 'approved',
      contextType: row.contextType,
      contextId: row.contextId,
      contextVerified: row.contextVerified,
      createdAt: row.createdAt.toISOString(),
      approvedAt: row.approvedAt?.toISOString() ?? null,
      giver: {
        userId: row.giverId,
        slug: giverProfile.slug,
        displayName: giverName,
      },
      recipient: {
        userId: row.recipientId,
        slug: recipientProfile.slug,
        displayName: recipientName,
      },
    };
  }
}
