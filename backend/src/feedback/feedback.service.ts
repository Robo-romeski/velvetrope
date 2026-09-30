import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventFeedbackEntity } from './event-feedback.entity';
import { EventsService } from '../events/events.service';
import { ApplicationsService } from '../applications/applications.service';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(EventFeedbackEntity)
    private readonly feedback: Repository<EventFeedbackEntity>,
    private readonly events: EventsService,
    private readonly applications: ApplicationsService,
  ) {}

  async submit(input: {
    eventId: string;
    userSub: string;
    rating: number;
    comment?: string;
    anonymous?: boolean;
  }): Promise<EventFeedbackEntity> {
    const event = await this.events.get(input.eventId);
    const approved = await this.applications.findApproved(
      input.eventId,
      input.userSub,
    );
    if (!approved) {
      throw new ForbiddenException(
        'Feedback is available to approved attendees',
      );
    }
    if (new Date(event.date).getTime() > Date.now()) {
      throw new BadRequestException('Feedback opens after the event starts');
    }
    if (
      !Number.isInteger(input.rating) ||
      input.rating < 1 ||
      input.rating > 5
    ) {
      throw new BadRequestException('Rating must be an integer from 1 to 5');
    }
    const existing = await this.feedback.findOne({
      where: { eventId: input.eventId, userSub: input.userSub },
    });
    if (existing) {
      throw new ConflictException('Feedback already submitted');
    }
    const comment = input.comment?.trim() || null;
    if (comment && comment.length > 2000) {
      throw new BadRequestException(
        'Feedback comment must be 2000 characters or fewer',
      );
    }
    return await this.feedback.save(
      this.feedback.create({
        eventId: input.eventId,
        userSub: input.userSub,
        rating: input.rating,
        comment,
        anonymous: input.anonymous !== false,
      }),
    );
  }

  async getMine(
    eventId: string,
    userSub: string,
  ): Promise<{
    submitted: boolean;
    rating?: number;
    comment?: string | null;
    anonymous?: boolean;
  }> {
    const item = await this.feedback.findOne({
      where: { eventId, userSub },
    });
    if (!item) return { submitted: false };
    return {
      submitted: true,
      rating: item.rating,
      comment: item.comment ?? null,
      anonymous: item.anonymous,
    };
  }

  async getForHost(eventId: string): Promise<{
    count: number;
    averageRating: number;
    distribution: Record<string, number>;
    comments: Array<{
      id: string;
      rating: number;
      comment: string;
      authorSub: string | null;
      createdAt: string;
    }>;
  }> {
    const items = await this.feedback.find({
      where: { eventId },
      order: { createdAt: 'DESC' },
    });
    const distribution: Record<string, number> = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };
    for (const item of items) {
      distribution[String(item.rating)] =
        (distribution[String(item.rating)] ?? 0) + 1;
    }
    const total = items.reduce((sum, item) => sum + item.rating, 0);
    return {
      count: items.length,
      averageRating: items.length === 0 ? 0 : total / items.length,
      distribution,
      comments: items
        .filter((item) => !!item.comment)
        .map((item) => ({
          id: item.id,
          rating: item.rating,
          comment: item.comment!,
          authorSub: item.anonymous ? null : item.userSub,
          createdAt: item.createdAt.toISOString(),
        })),
    };
  }
}
