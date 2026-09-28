import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CheckinService } from './checkin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { EventsService } from '../events/events.service';
import { ApplicationsService } from '../applications/applications.service';
import { getAuthUser } from '../auth/request-user';
import { StripePaymentsService } from '../stripe/stripe-payments.service';
import { PhotoCheckinService } from './photo-checkin.service';

@Controller('checkin')
export class CheckinController {
  constructor(
    private readonly svc: CheckinService,
    private readonly events: EventsService,
    private readonly apps: ApplicationsService,
    private readonly payments: StripePaymentsService,
    private readonly photos: PhotoCheckinService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Post('issue/:eventId')
  async issue(
    @Param('eventId') eventId: string,
    @Req() req: Request,
    @Body('userSub') userSub: string,
  ) {
    const { sub } = getAuthUser(req);
    await this.events.requireHost(eventId, sub);
    if (!userSub) throw new BadRequestException('userSub required');
    return await this.svc.issue(eventId, userSub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mine/:eventId')
  async mine(@Param('eventId') eventId: string, @Req() req: Request) {
    const { sub } = getAuthUser(req);
    const approved = await this.apps.findApproved(eventId, sub);
    if (!approved)
      throw new ForbiddenException('No approved application for this event');
    await this.payments.assertPaidIfRequired(eventId, sub);
    return await this.svc.issue(eventId, sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Get('event/:eventId')
  async listForEvent(@Param('eventId') eventId: string, @Req() req: Request) {
    const { sub } = getAuthUser(req);
    await this.events.requireHost(eventId, sub);
    return await this.svc.listForEvent(eventId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('photo/mine/:eventId')
  async photoStatus(@Param('eventId') eventId: string, @Req() req: Request) {
    const { sub } = getAuthUser(req);
    return await this.photos.getMine(eventId, sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('photo/mine/:eventId/upload')
  async requestPhotoUpload(
    @Param('eventId') eventId: string,
    @Req() req: Request,
    @Body() body: { contentType?: string; sizeBytes?: number },
  ) {
    const { sub } = getAuthUser(req);
    return await this.photos.requestUpload({
      eventId,
      userSub: sub,
      contentType: body.contentType ?? '',
      sizeBytes: Number(body.sizeBytes),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('photo/mine/:eventId/complete')
  async completePhotoUpload(
    @Param('eventId') eventId: string,
    @Req() req: Request,
    @Body() body: { photoId?: string },
  ) {
    const { sub } = getAuthUser(req);
    if (!body.photoId) throw new BadRequestException('photoId required');
    return await this.photos.completeUpload(eventId, sub, body.photoId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Get('photo/ticket/:token')
  async photoForTicket(@Param('token') token: string, @Req() req: Request) {
    const { sub } = getAuthUser(req);
    const ticket = await this.svc.getByToken(token);
    await this.events.requireHost(ticket.eventId, sub);
    return await this.photos.getHostPhoto(ticket.eventId, ticket.userSub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('host')
  @Post('verify/:token')
  async verify(
    @Param('token') token: string,
    @Req() req: Request,
    @Body() body: { photoConfirmed?: boolean },
  ) {
    const { sub } = getAuthUser(req);
    const ticket = await this.svc.getByToken(token);
    const event = await this.events.requireHost(ticket.eventId, sub);
    if (event.requirePhotoCheckin) {
      if (body.photoConfirmed !== true) {
        throw new ForbiddenException('Host photo confirmation required');
      }
      await this.photos.assertReady(ticket.eventId, ticket.userSub);
    }
    const used = await this.svc.verifyAndUse(token);
    if (event.requirePhotoCheckin) {
      await this.photos.markVerified(ticket.eventId, ticket.userSub, sub);
    }
    return used;
  }
}
