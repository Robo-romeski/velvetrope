import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { getAuthUser, getOptionalAuthUser } from '../auth/request-user';
import type { ContentType } from './educational-content.entity';
import { EducationService } from './education.service';
import { StripePaymentsService } from '../stripe/stripe-payments.service';

@Controller('learn')
export class EducationController {
  constructor(
    private readonly education: EducationService,
    private readonly payments: StripePaymentsService,
  ) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async catalog(@Query('tag') tag?: string, @Query('q') q?: string) {
    return await this.education.listPublished({ tag, q });
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async mine(@Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.education.listMine(sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('educator/enable')
  async enableEducator(@Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.education.enableEducator(sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Req() req: Request,
    @Body()
    body: {
      title?: string;
      summary?: string;
      contentType?: ContentType;
      tags?: string[];
      groupId?: string | null;
      externalUrl?: string | null;
    },
  ) {
    const { sub } = getAuthUser(req);
    return await this.education.createDraft(sub, {
      title: body.title ?? '',
      summary: body.summary,
      contentType: body.contentType ?? 'guide',
      tags: body.tags,
      groupId: body.groupId,
      externalUrl: body.externalUrl,
    });
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug')
  async detail(@Req() req: Request, @Param('slug') slug: string) {
    const viewer = getOptionalAuthUser(req);
    return await this.education.getDetail(slug, viewer?.sub ?? null);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':slug')
  async update(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Body()
    body: Partial<{
      title: string;
      summary: string | null;
      contentType: ContentType;
      tags: string[];
      groupId: string | null;
      externalUrl: string | null;
      priceCents: number;
    }>,
  ) {
    const { sub } = getAuthUser(req);
    return await this.education.updateContent(slug, sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':slug/access')
  async access(@Req() req: Request, @Param('slug') slug: string) {
    const { sub } = getAuthUser(req);
    const detail = await this.education.getDetail(slug, sub);
    return detail.access;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':slug/checkout')
  async checkout(@Req() req: Request, @Param('slug') slug: string) {
    const { sub } = getAuthUser(req);
    return await this.payments.createCourseCheckoutSession(slug, sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':slug/checkout/confirm')
  async confirmCheckout(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Body() body: { sessionId?: string },
  ) {
    const { sub } = getAuthUser(req);
    const sessionId = (body.sessionId ?? '').trim();
    if (!sessionId) {
      throw new BadRequestException('sessionId required');
    }
    await this.payments.confirmCourseCheckoutSession(slug, sub, sessionId);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':slug/publish')
  async publish(@Req() req: Request, @Param('slug') slug: string) {
    const { sub } = getAuthUser(req);
    return await this.education.publish(slug, sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':slug/unpublish')
  async unpublish(@Req() req: Request, @Param('slug') slug: string) {
    const { sub } = getAuthUser(req);
    return await this.education.unpublish(slug, sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':slug/lessons')
  async addLesson(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Body() body: { title?: string; body?: string; isPreview?: boolean },
  ) {
    const { sub } = getAuthUser(req);
    return await this.education.addLesson(slug, sub, {
      title: body.title ?? '',
      body: body.body ?? '',
      isPreview: body.isPreview,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':slug/lessons/:lessonId')
  async updateLesson(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Param('lessonId') lessonId: string,
    @Body()
    body: Partial<{
      title: string;
      body: string;
      isPreview: boolean;
      sortOrder: number;
    }>,
  ) {
    const { sub } = getAuthUser(req);
    return await this.education.updateLesson(slug, lessonId, sub, body);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug/lessons/:lessonId')
  async lesson(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Param('lessonId') lessonId: string,
  ) {
    const viewer = getOptionalAuthUser(req);
    return await this.education.getLesson(slug, lessonId, viewer?.sub ?? null);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':slug/lessons/:lessonId/complete')
  async complete(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Param('lessonId') lessonId: string,
  ) {
    const { sub } = getAuthUser(req);
    return await this.education.completeLesson(slug, lessonId, sub);
  }
}
