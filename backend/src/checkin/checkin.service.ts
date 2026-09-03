import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckinTicketEntity } from './checkin-ticket.entity';

@Injectable()
export class CheckinService {
  constructor(
    @InjectRepository(CheckinTicketEntity)
    private readonly repo: Repository<CheckinTicketEntity>,
  ) {}

  private generateToken(length = 24): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < length; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return out;
  }

  async issue(eventId: string, userSub: string): Promise<CheckinTicketEntity> {
    // One active token per user/event for simplicity
    const existing = await this.repo.findOne({ where: { eventId, userSub, usedAt: null } as any });
    if (existing) return existing;
    const token = this.generateToken();
    const created = this.repo.create({ token, eventId, userSub });
    return await this.repo.save(created);
  }

  async verifyAndUse(token: string): Promise<CheckinTicketEntity> {
    const ticket = await this.repo.findOne({ where: { token } });
    if (!ticket) throw new NotFoundException('Invalid token');
    if (ticket.usedAt) throw new BadRequestException('Already used');
    ticket.usedAt = new Date();
    return await this.repo.save(ticket);
  }
}


