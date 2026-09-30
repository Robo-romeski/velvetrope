import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { ChatMessageEntity } from './chat-message.entity';
import { EventsService } from '../events/events.service';
import { ApplicationsService } from '../applications/applications.service';
import { UserEntity } from '../auth/user.entity';

const CHAT_WINDOW_MS = 48 * 60 * 60 * 1000;

export type ChatMessageDto = {
  id: string;
  eventId: string;
  author: {
    id: string;
    displayName: string;
  };
  body: string | null;
  deleted: boolean;
  createdAt: string;
};

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessageEntity)
    private readonly messages: Repository<ChatMessageEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly events: EventsService,
    private readonly applications: ApplicationsService,
  ) {}

  async requireAccess(
    eventId: string,
    userSub: string,
  ): Promise<{ isHost: boolean }> {
    const event = await this.events.get(eventId);
    if (event.hostId === userSub) return { isHost: true };
    const approved = await this.applications.findApproved(eventId, userSub);
    if (!approved) {
      throw new ForbiddenException(
        'Chat is available to approved attendees and the event host',
      );
    }
    const eventTime = new Date(event.date).getTime();
    const now = Date.now();
    if (
      !Number.isFinite(eventTime) ||
      now < eventTime - CHAT_WINDOW_MS ||
      now > eventTime + CHAT_WINDOW_MS
    ) {
      throw new ForbiddenException(
        'Event chat is available from 48 hours before until 48 hours after the event',
      );
    }
    return { isHost: false };
  }

  async list(
    eventId: string,
    userSub: string,
    input?: { before?: string; limit?: number },
  ): Promise<{ items: ChatMessageDto[]; hasMore: boolean }> {
    await this.requireAccess(eventId, userSub);
    const limit = Math.min(100, Math.max(1, Math.floor(input?.limit ?? 50)));
    const before = input?.before ? new Date(input.before) : null;
    if (before && Number.isNaN(before.getTime())) {
      throw new BadRequestException('Invalid before timestamp');
    }
    const rows = await this.messages.find({
      where: {
        eventId,
        ...(before ? { createdAt: LessThan(before) } : {}),
      },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit).reverse();
    return {
      items: await this.toDtos(page),
      hasMore,
    };
  }

  async create(
    eventId: string,
    authorSub: string,
    body: string,
  ): Promise<ChatMessageDto> {
    await this.requireAccess(eventId, authorSub);
    const normalized = body.trim();
    if (!normalized) throw new BadRequestException('Message body required');
    if (normalized.length > 1000) {
      throw new BadRequestException('Message must be 1000 characters or fewer');
    }
    const saved = await this.messages.save(
      this.messages.create({
        eventId,
        authorSub,
        body: normalized,
      }),
    );
    return (await this.toDtos([saved]))[0];
  }

  async delete(messageId: string, hostSub: string): Promise<ChatMessageDto> {
    const message = await this.messages.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    const event = await this.events.get(message.eventId);
    if (event.hostId !== hostSub) {
      throw new ForbiddenException('Only the event host can remove messages');
    }
    if (!message.deletedAt) {
      message.deletedAt = new Date();
      message.deletedByHostId = hostSub;
      await this.messages.save(message);
    }
    return (await this.toDtos([message]))[0];
  }

  private async toDtos(
    messages: ChatMessageEntity[],
  ): Promise<ChatMessageDto[]> {
    const ids = [...new Set(messages.map((message) => message.authorSub))];
    const users =
      ids.length === 0
        ? []
        : await this.users.find({
            where: { id: In(ids) },
            select: ['id', 'name'],
          });
    const names = new Map(
      users.map((user) => [user.id, user.name?.trim() || 'Attendee']),
    );
    return messages.map((message) => ({
      id: message.id,
      eventId: message.eventId,
      author: {
        id: message.authorSub,
        displayName: names.get(message.authorSub) ?? 'Attendee',
      },
      body: message.deletedAt ? null : message.body,
      deleted: !!message.deletedAt,
      createdAt: message.createdAt.toISOString(),
    }));
  }
}
