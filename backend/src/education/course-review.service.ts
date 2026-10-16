import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseReviewEntity } from './course-review.entity';
import { EducationalContentEntity } from './educational-content.entity';
import { EducationLessonEntity } from './education-lesson.entity';
import { LessonProgressEntity } from './lesson-progress.entity';
import { CommerceService } from '../commerce/commerce.service';

@Injectable()
export class CourseReviewService {
  constructor(
    @InjectRepository(CourseReviewEntity)
    private readonly reviews: Repository<CourseReviewEntity>,
    @InjectRepository(EducationalContentEntity)
    private readonly contents: Repository<EducationalContentEntity>,
    @InjectRepository(EducationLessonEntity)
    private readonly lessons: Repository<EducationLessonEntity>,
    @InjectRepository(LessonProgressEntity)
    private readonly progress: Repository<LessonProgressEntity>,
    private readonly commerce: CommerceService,
  ) {}

  async submit(input: {
    contentSlug: string;
    userSub: string;
    rating: number;
    comment?: string;
    anonymous?: boolean;
  }): Promise<CourseReviewEntity> {
    const content = await this.requirePublished(input.contentSlug);
    await this.assertEligible(content, input.userSub);
    if (
      !Number.isInteger(input.rating) ||
      input.rating < 1 ||
      input.rating > 5
    ) {
      throw new BadRequestException('Rating must be an integer from 1 to 5');
    }
    const existing = await this.reviews.findOne({
      where: { contentId: content.id, userSub: input.userSub },
    });
    if (existing) {
      throw new ConflictException('Review already submitted');
    }
    const comment = input.comment?.trim() || null;
    if (comment && comment.length > 2000) {
      throw new BadRequestException(
        'Review comment must be 2000 characters or fewer',
      );
    }
    return await this.reviews.save(
      this.reviews.create({
        contentId: content.id,
        userSub: input.userSub,
        rating: input.rating,
        comment,
        anonymous: input.anonymous !== false,
      }),
    );
  }

  async getMine(contentSlug: string, userSub: string) {
    const content = await this.requirePublished(contentSlug);
    const item = await this.reviews.findOne({
      where: { contentId: content.id, userSub },
    });
    if (!item) return { submitted: false };
    return {
      submitted: true,
      rating: item.rating,
      comment: item.comment ?? null,
      anonymous: item.anonymous,
    };
  }

  async getPublicSummary(contentSlug: string) {
    const content = await this.requirePublished(contentSlug);
    return this.summarize(content.id);
  }

  async getForCreator(contentSlug: string, creatorId: string) {
    const content = await this.contents.findOne({ where: { slug: contentSlug } });
    if (!content) throw new NotFoundException('Content not found');
    if (content.creatorId !== creatorId) {
      throw new ForbiddenException('Not your content');
    }
    const summary = await this.summarize(content.id);
    const items = await this.reviews.find({
      where: { contentId: content.id },
      order: { createdAt: 'DESC' },
    });
    return {
      ...summary,
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

  async summarize(contentId: string) {
    const items = await this.reviews.find({ where: { contentId } });
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
    };
  }

  private async requirePublished(slug: string) {
    const content = await this.contents.findOne({ where: { slug } });
    if (!content || content.status !== 'published') {
      throw new NotFoundException('Content not found');
    }
    return content;
  }

  private async assertEligible(
    content: EducationalContentEntity,
    userSub: string,
  ): Promise<void> {
    if (content.creatorId === userSub) {
      throw new ForbiddenException('Creators cannot review their own content');
    }
    const hasAccess = await this.hasContentAccess(content, userSub);
    if (!hasAccess) {
      throw new ForbiddenException(
        'Reviews are available after you have access to this content',
      );
    }
    if (content.contentType === 'workshop_link') return;

    const lessonRows = await this.lessons.find({
      where: { contentId: content.id },
    });
    if (lessonRows.length === 0) {
      throw new BadRequestException('This content has no lessons yet');
    }
    const completed = await this.progress.count({
      where: { userId: userSub, contentId: content.id },
    });
    if (completed < lessonRows.length) {
      throw new ForbiddenException(
        'Complete all lessons before leaving a review',
      );
    }
  }

  private async hasContentAccess(
    content: EducationalContentEntity,
    viewerId: string,
  ): Promise<boolean> {
    const priceCents = Math.max(0, content.priceCents ?? 0);
    if (priceCents === 0) return true;
    return this.commerce.hasActiveEntitlement(
      viewerId,
      'course_access',
      content.id,
    );
  }
}
