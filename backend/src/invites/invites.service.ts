import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InviteEntity } from './invite.entity';
import { randomToken } from '../common/random-token';

@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(InviteEntity)
    private readonly repo: Repository<InviteEntity>,
  ) {}

  private generateCode(length = 8): string {
    return randomToken(length, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
  }

  async listForEvent(eventId: string): Promise<InviteEntity[]> {
    return await this.repo.find({
      where: { eventId },
      order: { createdAt: 'DESC' },
    });
  }

  private isExpired(invite: InviteEntity): boolean {
    if (!invite.expiresAt) return false;
    return invite.expiresAt.getTime() <= Date.now();
  }

  async statsForEvent(eventId: string): Promise<{
    eventId: string;
    total: number;
    redeemed: number;
    unused: number;
    expiredUnused: number;
    conversionRate: number;
  }> {
    const invites = await this.repo.find({ where: { eventId } });
    const total = invites.length;
    const redeemed = invites.filter((i) => !!i.usedAt).length;
    const unused = total - redeemed;
    const expiredUnused = invites.filter(
      (i) => !i.usedAt && this.isExpired(i),
    ).length;
    const conversionRate = total === 0 ? 0 : redeemed / total;
    return {
      eventId,
      total,
      redeemed,
      unused,
      expiredUnused,
      conversionRate,
    };
  }

  async generate(
    eventId: string,
    opts?: { expiresInHours?: number },
  ): Promise<InviteEntity> {
    let expiresAt: Date | null = null;
    if (opts?.expiresInHours != null && opts.expiresInHours > 0) {
      expiresAt = new Date(Date.now() + opts.expiresInHours * 3600 * 1000);
    }

    for (let i = 0; i < 10; i++) {
      const code = this.generateCode();
      const existing = await this.repo.findOne({ where: { code } });
      if (!existing) {
        const invite = this.repo.create({ code, eventId, expiresAt });
        return await this.repo.save(invite);
      }
    }
    throw new BadRequestException('Failed to generate unique code');
  }

  async validate(
    code: string,
  ): Promise<{
    valid: boolean;
    eventId?: string;
    used?: boolean;
    expired?: boolean;
  }> {
    const invite = await this.repo.findOne({ where: { code } });
    if (!invite) return { valid: false };
    const expired = this.isExpired(invite);
    if (expired) {
      return {
        valid: false,
        eventId: invite.eventId,
        used: !!invite.usedAt,
        expired: true,
      };
    }
    return { valid: true, eventId: invite.eventId, used: !!invite.usedAt };
  }

  async redeem(code: string, userSub: string): Promise<InviteEntity> {
    const invite = await this.repo.findOne({ where: { code } });
    if (!invite) throw new NotFoundException('Invalid invite');
    if (this.isExpired(invite)) {
      throw new BadRequestException('Invite code expired');
    }
    if (invite.usedAt) throw new BadRequestException('Invite already used');
    invite.usedAt = new Date();
    invite.usedBy = userSub;
    return await this.repo.save(invite);
  }
}
