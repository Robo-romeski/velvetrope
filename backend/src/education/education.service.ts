import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MembersService } from '../members/members.service';
import { uniqueSlug } from '../members/slug.util';
import {
  ContentType,
  EducationalContentEntity,
} from './educational-content.entity';
import { EducationLessonEntity } from './education-lesson.entity';
import { LessonProgressEntity } from './lesson-progress.entity';
import { MemberProfileEntity } from '../members/member-profile.entity';
import { CommerceService } from '../commerce/commerce.service';

@Injectable()
export class EducationService {
  constructor(
    @InjectRepository(EducationalContentEntity)
    private readonly contents: Repository<EducationalContentEntity>,
    @InjectRepository(EducationLessonEntity)
    private readonly lessons: Repository<EducationLessonEntity>,
    @InjectRepository(LessonProgressEntity)
    private readonly progress: Repository<LessonProgressEntity>,
    @InjectRepository(MemberProfileEntity)
    private readonly profiles: Repository<MemberProfileEntity>,
    private readonly members: MembersService,
    private readonly commerce: CommerceService,
  ) {}

  async enableEducator(userId: string) {
    const profile = await this.members.ensureProfileForUser(userId);
    profile.educator = true;
    await this.profiles.save(profile);
    return { educator: true };
  }

  async assertEducator(userId: string) {
    const profile = await this.members.ensureProfileForUser(userId);
    if (!profile.educator) {
      throw new ForbiddenException(
        'Enable educator mode on your profile to publish learning content',
      );
    }
  }

  async listPublished(filters: { tag?: string; q?: string }) {
    const rows = await this.contents.find({
      where: { status: 'published' },
      order: { publishedAt: 'DESC' },
    });
    return rows
      .filter((row) => this.matchesFilters(row, filters))
      .map((row) => this.toSummary(row));
  }

  async listMine(creatorId: string) {
    const rows = await this.contents.find({
      where: { creatorId },
      order: { updatedAt: 'DESC' },
    });
    return rows.map((row) => this.toSummary(row, true));
  }

  async createDraft(
    creatorId: string,
    input: {
      title: string;
      summary?: string;
      contentType: ContentType;
      tags?: string[];
      groupId?: string | null;
      externalUrl?: string | null;
    },
  ) {
    await this.assertEducator(creatorId);
    const title = (input.title ?? '').trim();
    if (title.length < 2) {
      throw new BadRequestException('Title is required');
    }
    const contentType = input.contentType ?? 'guide';
    const entity = this.contents.create({
      creatorId,
      slug: uniqueSlug(title),
      title,
      summary: input.summary?.trim().slice(0, 2000) || null,
      contentType,
      status: 'draft',
      tags: this.normalizeTags(input.tags ?? []),
      groupId: input.groupId?.trim() || null,
      externalUrl: this.optionalUrl(input.externalUrl),
      priceCents: 0,
    });
    const saved = await this.contents.save(entity);
    return this.getDetail(saved.slug, creatorId);
  }

  async updateContent(
    slug: string,
    userId: string,
    input: Partial<{
      title: string;
      summary: string | null;
      contentType: ContentType;
      tags: string[];
      groupId: string | null;
      externalUrl: string | null;
      priceCents: number;
    }>,
  ) {
    const content = await this.requireOwned(slug, userId);
    if (input.title !== undefined) {
      const title = input.title.trim();
      if (title.length < 2) throw new BadRequestException('Title is required');
      content.title = title;
    }
    if (input.summary !== undefined) {
      content.summary = input.summary?.trim().slice(0, 2000) || null;
    }
    if (input.contentType !== undefined) {
      content.contentType = input.contentType;
    }
    if (input.tags !== undefined) {
      content.tags = this.normalizeTags(input.tags);
    }
    if (input.groupId !== undefined) {
      content.groupId = input.groupId?.trim() || null;
    }
    if (input.externalUrl !== undefined) {
      content.externalUrl = this.optionalUrl(input.externalUrl);
    }
    if (input.priceCents !== undefined) {
      content.priceCents = Math.max(0, Math.floor(input.priceCents));
    }
    await this.contents.save(content);
    return this.getDetail(content.slug, userId);
  }

  async publish(slug: string, userId: string) {
    const content = await this.requireOwned(slug, userId);
    const lessonRows = await this.lessons.find({
      where: { contentId: content.id },
      order: { sortOrder: 'ASC' },
    });
    if (content.contentType === 'workshop_link') {
      if (!content.externalUrl) {
        throw new BadRequestException(
          'Workshop link URL is required to publish',
        );
      }
    } else if (lessonRows.length === 0) {
      throw new BadRequestException(
        'Add at least one lesson before publishing',
      );
    }
    content.status = 'published';
    content.publishedAt = new Date();
    await this.contents.save(content);
    return this.getDetail(content.slug, userId);
  }

  async unpublish(slug: string, userId: string) {
    const content = await this.requireOwned(slug, userId);
    content.status = 'draft';
    content.publishedAt = null;
    await this.contents.save(content);
    return this.getDetail(content.slug, userId);
  }

  async getDetail(slug: string, viewerId: string | null) {
    const content = await this.contents.findOne({ where: { slug } });
    if (!content) throw new NotFoundException('Content not found');
    const isOwner = viewerId === content.creatorId;
    if (content.status !== 'published' && !isOwner) {
      throw new NotFoundException('Content not found');
    }
    const lessons = await this.lessons.find({
      where: { contentId: content.id },
      order: { sortOrder: 'ASC' },
    });
    const hasAccess = await this.hasContentAccess(content, viewerId, isOwner);
    const published = content.status === 'published';
    let completedLessonIds: string[] = [];
    if (viewerId) {
      const prog = await this.progress.find({
        where: { userId: viewerId, contentId: content.id },
      });
      completedLessonIds = prog.map((p) => p.lessonId);
    }
    const creator = await this.members.getPublicProfile(
      content.creatorId,
      viewerId,
    );
    return {
      ...this.toSummary(content, isOwner),
      summary: content.summary,
      groupId: content.groupId,
      externalUrl: published || isOwner ? content.externalUrl : null,
      priceCents: content.priceCents ?? 0,
      access: await this.buildAccessSummary(content, viewerId, isOwner),
      lessons: lessons.map((l) => ({
        id: l.id,
        sortOrder: l.sortOrder,
        title: l.title,
        body: hasAccess || (published && l.isPreview) ? l.body : undefined,
        isPreview: l.isPreview,
        completed: completedLessonIds.includes(l.id),
      })),
      creator: {
        userId: creator.userId,
        slug: creator.slug,
        displayName: creator.displayName,
      },
      progress: viewerId
        ? {
            completed: completedLessonIds.length,
            total: lessons.length,
          }
        : null,
    };
  }

  async getLesson(
    contentSlug: string,
    lessonId: string,
    viewerId: string | null,
  ) {
    const detail = await this.getDetail(contentSlug, viewerId);
    const lesson = detail.lessons.find((l) => l.id === lessonId);
    if (!lesson || lesson.body === undefined) {
      throw new ForbiddenException('Lesson not available');
    }
    return { content: detail, lesson };
  }

  async addLesson(
    slug: string,
    userId: string,
    input: { title: string; body: string; isPreview?: boolean },
  ) {
    const content = await this.requireOwned(slug, userId);
    const title = (input.title ?? '').trim();
    const body = (input.body ?? '').trim();
    if (!title || !body) {
      throw new BadRequestException('Lesson title and body required');
    }
    const last = await this.lessons.findOne({
      where: { contentId: content.id },
      order: { sortOrder: 'DESC' },
    });
    const lesson = await this.lessons.save(
      this.lessons.create({
        contentId: content.id,
        sortOrder: (last?.sortOrder ?? -1) + 1,
        title: title.slice(0, 200),
        body: body.slice(0, 50_000),
        isPreview: input.isPreview === true,
      }),
    );
    return lesson;
  }

  async updateLesson(
    slug: string,
    lessonId: string,
    userId: string,
    input: Partial<{
      title: string;
      body: string;
      isPreview: boolean;
      sortOrder: number;
    }>,
  ) {
    const content = await this.requireOwned(slug, userId);
    const lesson = await this.lessons.findOne({
      where: { id: lessonId, contentId: content.id },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (input.title !== undefined)
      lesson.title = input.title.trim().slice(0, 200);
    if (input.body !== undefined)
      lesson.body = input.body.trim().slice(0, 50_000);
    if (input.isPreview !== undefined) lesson.isPreview = input.isPreview;
    if (input.sortOrder !== undefined) lesson.sortOrder = input.sortOrder;
    return await this.lessons.save(lesson);
  }

  async completeLesson(contentSlug: string, lessonId: string, userId: string) {
    const content = await this.contents.findOne({
      where: { slug: contentSlug },
    });
    if (!content || content.status !== 'published') {
      throw new NotFoundException('Content not found');
    }
    const isOwner = userId === content.creatorId;
    if (!(await this.hasContentAccess(content, userId, isOwner))) {
      throw new ForbiddenException('Purchase required to track progress');
    }
    const lesson = await this.lessons.findOne({
      where: { id: lessonId, contentId: content.id },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    const existing = await this.progress.findOne({
      where: { userId, lessonId },
    });
    if (!existing) {
      await this.progress.save(
        this.progress.create({
          userId,
          contentId: content.id,
          lessonId,
        }),
      );
    }
    return this.getDetail(contentSlug, userId);
  }

  private async requireOwned(slug: string, userId: string) {
    const content = await this.contents.findOne({ where: { slug } });
    if (!content) throw new NotFoundException('Content not found');
    if (content.creatorId !== userId) {
      throw new ForbiddenException('Not your content');
    }
    return content;
  }

  private matchesFilters(
    row: EducationalContentEntity,
    filters: { tag?: string; q?: string },
  ) {
    const tag = (filters.tag ?? '').trim().toLowerCase();
    const q = (filters.q ?? '').trim().toLowerCase();
    if (tag && !(row.tags ?? []).some((t) => t.toLowerCase() === tag)) {
      return false;
    }
    if (q) {
      const hay = `${row.title} ${row.summary ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  private async hasContentAccess(
    content: EducationalContentEntity,
    viewerId: string | null,
    isOwner: boolean,
  ): Promise<boolean> {
    if (isOwner) return true;
    if (content.status !== 'published') return false;
    const priceCents = Math.max(0, content.priceCents ?? 0);
    if (priceCents === 0) return Boolean(viewerId);
    if (!viewerId) return false;
    return this.commerce.hasActiveEntitlement(
      viewerId,
      'course_access',
      content.id,
    );
  }

  private async buildAccessSummary(
    content: EducationalContentEntity,
    viewerId: string | null,
    isOwner: boolean,
  ) {
    const priceCents = Math.max(0, content.priceCents ?? 0);
    if (priceCents === 0) {
      return {
        required: false,
        priceCents: 0,
        status: 'not_required' as const,
      };
    }
    if (isOwner) {
      return { required: true, priceCents, status: 'paid' as const };
    }
    const entitled =
      viewerId &&
      (await this.commerce.hasActiveEntitlement(
        viewerId,
        'course_access',
        content.id,
      ));
    return {
      required: true,
      priceCents,
      status: entitled ? ('paid' as const) : ('pending' as const),
    };
  }

  private toSummary(row: EducationalContentEntity, includeStatus = false) {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      contentType: row.contentType,
      tags: row.tags ?? [],
      priceCents: row.priceCents ?? 0,
      publishedAt: row.publishedAt,
      ...(includeStatus ? { status: row.status } : {}),
    };
  }

  private normalizeTags(tags: string[]) {
    const out: string[] = [];
    for (const raw of tags) {
      const tag = (raw ?? '').trim().slice(0, 48);
      if (!tag) continue;
      if (!out.includes(tag)) out.push(tag);
      if (out.length >= 16) break;
    }
    return out;
  }

  private optionalUrl(url: string | null | undefined): string | null {
    const trimmed = (url ?? '').trim();
    if (!trimmed) return null;
    if (!/^https?:\/\//i.test(trimmed)) {
      throw new BadRequestException('URL must start with http:// or https://');
    }
    return trimmed.slice(0, 2048);
  }
}
