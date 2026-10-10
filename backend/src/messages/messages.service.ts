import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Not, Repository } from 'typeorm';
import { MembersService } from '../members/members.service';
import { DirectConversationEntity } from './direct-conversation.entity';
import { DirectMessageEntity } from './direct-message.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(DirectConversationEntity)
    private readonly conversations: Repository<DirectConversationEntity>,
    @InjectRepository(DirectMessageEntity)
    private readonly messages: Repository<DirectMessageEntity>,
    private readonly members: MembersService,
  ) {}

  async createConversation(senderId: string, recipientId: string) {
    const targetId = recipientId.trim();
    if (!targetId) {
      throw new BadRequestException('recipientId required');
    }
    if (senderId === targetId) {
      throw new BadRequestException('You cannot message yourself');
    }

    await this.members.ensureProfileForUser(senderId);
    await this.members.getPublicProfile(targetId, senderId);
    if (!(await this.members.canSendMessage(senderId, targetId))) {
      throw new ForbiddenException(
        'This member is not accepting messages from you',
      );
    }

    const [participantAId, participantBId] = [senderId, targetId].sort();
    let conversation = await this.conversations.findOne({
      where: { participantAId, participantBId },
    });
    if (!conversation) {
      const now = new Date();
      try {
        conversation = await this.conversations.save(
          this.conversations.create({
            participantAId,
            participantBId,
            participantAReadAt: participantAId === senderId ? now : null,
            participantBReadAt: participantBId === senderId ? now : null,
            lastMessageAt: null,
          }),
        );
      } catch {
        conversation = await this.conversations.findOne({
          where: { participantAId, participantBId },
        });
        if (!conversation)
          throw new BadRequestException('Could not start conversation');
      }
    }
    return await this.toConversationView(conversation, senderId);
  }

  async listConversations(userId: string) {
    const rows = await this.conversations.find({
      where: [{ participantAId: userId }, { participantBId: userId }],
      order: { lastMessageAt: 'DESC', updatedAt: 'DESC' },
      take: 100,
    });
    const visible = [];
    for (const row of rows) {
      const otherId = this.otherParticipant(row, userId);
      if (await this.members.isBlockedEitherWay(userId, otherId)) continue;
      visible.push(await this.toConversationView(row, userId));
    }
    return visible;
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.assertAccessible(conversationId, userId);
    const rows = await this.messages.find({
      where: { conversationId: conversation.id },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return {
      conversation: await this.toConversationView(conversation, userId),
      messages: rows.reverse().map((message) => ({
        id: message.id,
        senderId: message.senderId,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      })),
    };
  }

  async sendMessage(conversationId: string, senderId: string, rawBody: string) {
    const conversation = await this.assertAccessible(conversationId, senderId);
    const recipientId = this.otherParticipant(conversation, senderId);
    if (!(await this.members.canSendMessage(senderId, recipientId))) {
      throw new ForbiddenException(
        'This member is not accepting messages from you',
      );
    }

    const body = (rawBody ?? '').trim();
    if (!body) throw new BadRequestException('Message cannot be empty');
    if (body.length > 4000) {
      throw new BadRequestException(
        'Message must be 4,000 characters or fewer',
      );
    }

    const message = await this.messages.save(
      this.messages.create({
        conversationId: conversation.id,
        senderId,
        body,
      }),
    );
    conversation.lastMessageAt = message.createdAt;
    if (conversation.participantAId === senderId) {
      conversation.participantAReadAt = message.createdAt;
    } else {
      conversation.participantBReadAt = message.createdAt;
    }
    await this.conversations.save(conversation);
    return {
      id: message.id,
      senderId: message.senderId,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    };
  }

  async markRead(conversationId: string, userId: string) {
    const conversation = await this.assertAccessible(conversationId, userId);
    const now = new Date();
    if (conversation.participantAId === userId) {
      conversation.participantAReadAt = now;
    } else {
      conversation.participantBReadAt = now;
    }
    await this.conversations.save(conversation);
    return { readAt: now.toISOString() };
  }

  private async assertAccessible(conversationId: string, userId: string) {
    const conversation = await this.conversations.findOne({
      where: { id: conversationId },
    });
    if (
      !conversation ||
      (conversation.participantAId !== userId &&
        conversation.participantBId !== userId)
    ) {
      throw new NotFoundException('Conversation not found');
    }
    const otherId = this.otherParticipant(conversation, userId);
    if (await this.members.isBlockedEitherWay(userId, otherId)) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  private otherParticipant(
    conversation: DirectConversationEntity,
    userId: string,
  ) {
    return conversation.participantAId === userId
      ? conversation.participantBId
      : conversation.participantAId;
  }

  private async toConversationView(
    conversation: DirectConversationEntity,
    userId: string,
  ) {
    const otherId = this.otherParticipant(conversation, userId);
    const readAt =
      conversation.participantAId === userId
        ? conversation.participantAReadAt
        : conversation.participantBReadAt;
    const unreadCount = await this.messages.count({
      where: {
        conversationId: conversation.id,
        senderId: Not(userId),
        ...(readAt ? { createdAt: MoreThan(readAt) } : {}),
      },
    });
    const lastMessage = await this.messages.findOne({
      where: { conversationId: conversation.id },
      order: { createdAt: 'DESC' },
    });
    const otherMember = await this.members.getPublicProfile(otherId, userId);
    return {
      id: conversation.id,
      otherMember: {
        userId: otherMember.userId,
        slug: otherMember.slug,
        displayName: otherMember.displayName,
        avatarUrl: otherMember.avatarUrl ?? null,
      },
      lastMessage: lastMessage
        ? {
            body: lastMessage.body,
            senderId: lastMessage.senderId,
            createdAt: lastMessage.createdAt.toISOString(),
          }
        : null,
      lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
      unreadCount,
      canSend: await this.members.canSendMessage(userId, otherId),
    };
  }
}
