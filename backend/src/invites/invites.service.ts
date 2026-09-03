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

  async generate(eventId: string): Promise<InviteEntity> {
    for (let i = 0; i < 10; i++) {
      const code = this.generateCode();
      const existing = await this.repo.findOne({ where: { code } });
      if (!existing) {
        const invite = this.repo.create({ code, eventId });
        return await this.repo.save(invite);
      }
    }
    throw new BadRequestException('Failed to generate unique code');
  }

  async validate(
    code: string,
  ): Promise<{ valid: boolean; eventId?: string; used?: boolean }> {
    const invite = await this.repo.findOne({ where: { code } });
    if (!invite) return { valid: false };
    return { valid: true, eventId: invite.eventId, used: !!invite.usedAt };
  }

  async redeem(code: string, userSub: string): Promise<InviteEntity> {
    const invite = await this.repo.findOne({ where: { code } });
    if (!invite) throw new NotFoundException('Invalid invite');
    if (invite.usedAt) throw new BadRequestException('Invite already used');
    invite.usedAt = new Date();
    invite.usedBy = userSub;
    return await this.repo.save(invite);
  }
}
