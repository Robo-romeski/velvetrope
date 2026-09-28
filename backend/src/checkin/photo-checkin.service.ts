import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { CheckinPhotoEntity } from './checkin-photo.entity';
import { PhotoStorageService } from './photo-storage.service';
import { EventsService } from '../events/events.service';
import { ApplicationsService } from '../applications/applications.service';
import { StripePaymentsService } from '../stripe/stripe-payments.service';

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PhotoCheckinService implements OnModuleInit, OnModuleDestroy {
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(CheckinPhotoEntity)
    private readonly photos: Repository<CheckinPhotoEntity>,
    private readonly storage: PhotoStorageService,
    private readonly events: EventsService,
    private readonly applications: ApplicationsService,
    private readonly payments: StripePaymentsService,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test' || !this.storage.isConfigured()) return;
    void this.cleanupExpired();
    this.cleanupTimer = setInterval(
      () => void this.cleanupExpired(),
      CLEANUP_INTERVAL_MS,
    );
    this.cleanupTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  async getMine(
    eventId: string,
    userSub: string,
  ): Promise<{
    required: boolean;
    configured: boolean;
    uploaded: boolean;
    verifiedAt: string | null;
    expiresAt: string | null;
  }> {
    const event = await this.events.get(eventId);
    const photo = await this.photos.findOne({ where: { eventId, userSub } });
    return {
      required: event.requirePhotoCheckin,
      configured: this.storage.isConfigured(),
      uploaded: !!photo?.uploadedAt,
      verifiedAt: photo?.verifiedAt?.toISOString() ?? null,
      expiresAt: photo?.expiresAt?.toISOString() ?? null,
    };
  }

  async requestUpload(input: {
    eventId: string;
    userSub: string;
    contentType: string;
    sizeBytes: number;
  }): Promise<{
    photoId: string;
    uploadUrl: string;
    headers: Record<string, string>;
    expiresAt: string;
  }> {
    const event = await this.events.get(input.eventId);
    if (!event.requirePhotoCheckin) {
      throw new BadRequestException(
        'This event does not require a check-in photo',
      );
    }
    const approved = await this.applications.findApproved(
      input.eventId,
      input.userSub,
    );
    if (!approved) {
      throw new ForbiddenException(
        'An approved application is required to upload a check-in photo',
      );
    }
    await this.payments.assertPaidIfRequired(input.eventId, input.userSub);
    this.storage.validateUpload(input.contentType, input.sizeBytes);

    const eventTime = new Date(event.date).getTime();
    const expiresAt = new Date(eventTime + RETENTION_MS);
    if (!Number.isFinite(eventTime) || expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Photo retention window has ended');
    }

    const objectKey = `checkin-photos/${input.eventId}/${randomUUID()}`;
    const signed = await this.storage.createUploadUrl({
      objectKey,
      contentType: input.contentType,
    });
    const existing = await this.photos.findOne({
      where: { eventId: input.eventId, userSub: input.userSub },
    });
    const previousObjectKey = existing?.objectKey;
    const photo =
      existing ??
      this.photos.create({
        eventId: input.eventId,
        userSub: input.userSub,
      });
    photo.objectKey = objectKey;
    photo.contentType = input.contentType;
    photo.sizeBytes = input.sizeBytes;
    photo.expiresAt = expiresAt;
    photo.uploadedAt = null;
    photo.verifiedAt = null;
    photo.verifiedByHostId = null;
    const saved = await this.photos.save(photo);
    if (previousObjectKey && previousObjectKey !== objectKey) {
      await this.storage.deleteObject(previousObjectKey);
    }

    return {
      photoId: saved.id,
      uploadUrl: signed.url,
      headers: signed.headers,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async completeUpload(
    eventId: string,
    userSub: string,
    photoId: string,
  ): Promise<CheckinPhotoEntity> {
    const photo = await this.photos.findOne({
      where: { id: photoId, eventId, userSub },
    });
    if (!photo) throw new NotFoundException('Check-in photo not found');
    await this.storage.verifyUploaded({
      objectKey: photo.objectKey,
      contentType: photo.contentType,
      sizeBytes: photo.sizeBytes,
    });
    photo.uploadedAt = new Date();
    return await this.photos.save(photo);
  }

  async getHostPhoto(
    eventId: string,
    userSub: string,
  ): Promise<{
    required: boolean;
    uploaded: boolean;
    url?: string;
    expiresAt?: string;
  }> {
    const event = await this.events.get(eventId);
    const photo = await this.photos.findOne({ where: { eventId, userSub } });
    if (!photo?.uploadedAt || photo.expiresAt.getTime() <= Date.now()) {
      return {
        required: event.requirePhotoCheckin,
        uploaded: false,
      };
    }
    return {
      required: event.requirePhotoCheckin,
      uploaded: true,
      url: await this.storage.createReadUrl(photo.objectKey),
      expiresAt: photo.expiresAt.toISOString(),
    };
  }

  async assertReady(eventId: string, userSub: string): Promise<void> {
    const photo = await this.photos.findOne({ where: { eventId, userSub } });
    if (!photo?.uploadedAt || photo.expiresAt.getTime() <= Date.now()) {
      throw new ForbiddenException(
        'A current check-in photo is required for this event',
      );
    }
  }

  async markVerified(
    eventId: string,
    userSub: string,
    hostSub: string,
  ): Promise<void> {
    const photo = await this.photos.findOne({ where: { eventId, userSub } });
    if (!photo?.uploadedAt) {
      throw new ForbiddenException('Check-in photo not available');
    }
    photo.verifiedAt = new Date();
    photo.verifiedByHostId = hostSub;
    await this.photos.save(photo);
  }

  async deleteForUser(userSub: string): Promise<void> {
    const photos = await this.photos.find({ where: { userSub } });
    for (const photo of photos) {
      await this.storage.deleteObject(photo.objectKey);
    }
    await this.photos.delete({ userSub });
  }

  async listForUser(userSub: string): Promise<CheckinPhotoEntity[]> {
    return await this.photos.find({
      where: { userSub },
      order: { createdAt: 'DESC' },
    });
  }

  async cleanupExpired(): Promise<number> {
    const expired = await this.photos.find({
      where: { expiresAt: LessThanOrEqual(new Date()) },
    });
    for (const photo of expired) {
      await this.storage.deleteObject(photo.objectKey);
    }
    if (expired.length > 0) {
      await this.photos.delete({
        id: In(expired.map((photo) => photo.id)),
      });
    }
    return expired.length;
  }
}
