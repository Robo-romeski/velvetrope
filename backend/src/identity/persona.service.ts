import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import {
  IdentityVerificationEntity,
  IdentityVerificationStatus,
} from './identity-verification.entity';

type PersonaApiResponse = {
  data?: {
    id?: string;
  };
  meta?: {
    'session-token'?: string;
  };
};

type PersonaWebhook = {
  data?: {
    id?: string;
    attributes?: {
      name?: string;
      payload?: {
        data?: {
          id?: string;
        };
      };
    };
  };
};

@Injectable()
export class PersonaService {
  constructor(
    @InjectRepository(IdentityVerificationEntity)
    private readonly verifications: Repository<IdentityVerificationEntity>,
  ) {}

  isConfigured(): boolean {
    return (
      process.env.NODE_ENV === 'test' ||
      !!(
        process.env.PERSONA_API_KEY?.trim() &&
        process.env.PERSONA_TEMPLATE_ID?.trim() &&
        process.env.PERSONA_ENVIRONMENT_ID?.trim()
      )
    );
  }

  async status(userSub: string): Promise<{
    configured: boolean;
    status: IdentityVerificationStatus;
    verifiedAt: string | null;
  }> {
    const item = await this.verifications.findOne({ where: { userSub } });
    return {
      configured: this.isConfigured(),
      status: item?.status ?? 'not_started',
      verifiedAt: item?.verifiedAt?.toISOString() ?? null,
    };
  }

  async createSession(userSub: string): Promise<{
    status: IdentityVerificationStatus;
    inquiryId?: string;
    sessionToken?: string;
    environmentId?: string;
  }> {
    this.assertConfigured();
    let item = await this.verifications.findOne({ where: { userSub } });
    if (item?.status === 'approved') {
      return { status: 'approved', inquiryId: item.inquiryId ?? undefined };
    }
    if (item?.status === 'needs_review') {
      return {
        status: 'needs_review',
        inquiryId: item.inquiryId ?? undefined,
      };
    }

    if (process.env.NODE_ENV === 'test') {
      item =
        item ??
        this.verifications.create({
          userSub,
          provider: 'persona',
          status: 'pending',
        });
      item.inquiryId = item.inquiryId ?? `inq_test_${randomUUID()}`;
      item.status = 'pending';
      await this.verifications.save(item);
      return {
        status: 'pending',
        inquiryId: item.inquiryId,
        sessionToken: `session_test_${randomUUID()}`,
        environmentId: 'env_test',
      };
    }

    let response: PersonaApiResponse;
    if (item?.inquiryId && item.status === 'pending') {
      response = await this.personaRequest(
        `/inquiries/${encodeURIComponent(item.inquiryId)}/resume`,
        { method: 'POST' },
      );
    } else {
      response = await this.personaRequest('/inquiries', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'inquiry',
            attributes: {
              'inquiry-template-id': process.env.PERSONA_TEMPLATE_ID!.trim(),
              'reference-id': userSub,
            },
          },
        }),
      });
      const inquiryId = response.data?.id;
      if (!inquiryId) {
        throw new BadGatewayException('Persona did not return an inquiry ID');
      }
      item =
        item ??
        this.verifications.create({
          userSub,
          provider: 'persona',
        });
      item.inquiryId = inquiryId;
      item.status = 'pending';
      item.verifiedAt = null;
      await this.verifications.save(item);
    }

    const sessionToken = response.meta?.['session-token'];
    if (!item?.inquiryId || !sessionToken) {
      throw new BadGatewayException('Persona did not return a session token');
    }
    return {
      status: item.status,
      inquiryId: item.inquiryId,
      sessionToken,
      environmentId: process.env.PERSONA_ENVIRONMENT_ID!.trim(),
    };
  }

  async assertApproved(userSub: string): Promise<void> {
    const item = await this.verifications.findOne({ where: { userSub } });
    if (item?.status !== 'approved') {
      throw new ForbiddenException(
        'Identity verification is required before ticket issuance',
      );
    }
  }

  async processWebhook(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): Promise<{ ok: true; ignored?: boolean }> {
    const secret = process.env.PERSONA_WEBHOOK_SECRET?.trim();
    if (!secret) {
      throw new ServiceUnavailableException(
        'Persona webhook is not configured',
      );
    }
    const signature = this.verifySignature(rawBody, signatureHeader, secret);
    if (!signature.valid || !signature.timestamp) {
      throw new BadRequestException('Invalid Persona signature');
    }
    let payload: PersonaWebhook;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as PersonaWebhook;
    } catch {
      throw new BadRequestException('Invalid Persona webhook JSON');
    }
    const eventId = payload.data?.id;
    const eventName = payload.data?.attributes?.name;
    const inquiryId = payload.data?.attributes?.payload?.data?.id;
    if (!eventId || !eventName || !inquiryId) {
      throw new BadRequestException('Invalid Persona webhook payload');
    }

    const item = await this.verifications.findOne({ where: { inquiryId } });
    if (!item) return { ok: true, ignored: true };
    if (item.lastWebhookEventId === eventId) {
      return { ok: true, ignored: true };
    }
    const webhookAt = new Date(signature.timestamp * 1000);
    if (item.lastWebhookAt && webhookAt <= item.lastWebhookAt) {
      return { ok: true, ignored: true };
    }

    const status = this.mapWebhookStatus(eventName);
    if (status) {
      item.status = status;
      item.verifiedAt = status === 'approved' ? webhookAt : null;
    }
    item.lastWebhookAt = webhookAt;
    item.lastWebhookEventId = eventId;
    await this.verifications.save(item);
    return { ok: true };
  }

  async listForUser(
    userSub: string,
  ): Promise<IdentityVerificationEntity | null> {
    return await this.verifications.findOne({ where: { userSub } });
  }

  async redactAndDeleteForUser(userSub: string): Promise<void> {
    const item = await this.verifications.findOne({ where: { userSub } });
    if (!item) return;
    if (process.env.NODE_ENV !== 'test' && item.inquiryId) {
      this.assertConfigured();
      await this.personaRequest(
        `/inquiries/${encodeURIComponent(item.inquiryId)}`,
        { method: 'DELETE' },
      );
    }
    await this.verifications.delete({ userSub });
  }

  private async personaRequest(
    path: string,
    init: RequestInit,
  ): Promise<PersonaApiResponse> {
    const response = await fetch(`https://api.withpersona.com/api/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${process.env.PERSONA_API_KEY!.trim()}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
    const body = (await response
      .json()
      .catch(() => ({}))) as PersonaApiResponse;
    if (!response.ok) {
      throw new BadGatewayException(
        `Persona request failed (${response.status})`,
      );
    }
    return body;
  }

  private verifySignature(
    rawBody: Buffer,
    header: string | undefined,
    secret: string,
  ): { valid: boolean; timestamp?: number } {
    if (!header) return { valid: false };
    const pairs = header.split(' ');
    const timestampValue = pairs[0]?.match(/(?:^|,)t=(\d+)/)?.[1];
    const timestamp = Number(timestampValue);
    if (
      !Number.isFinite(timestamp) ||
      Math.abs(Date.now() / 1000 - timestamp) > 5 * 60
    ) {
      return { valid: false };
    }
    const signatures = pairs
      .map((pair) => pair.match(/(?:^|,)v1=([a-f0-9]+)/i)?.[1])
      .filter((value): value is string => !!value);
    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody.toString('utf8')}`)
      .digest('hex');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const valid = signatures.some((candidate) => {
      const candidateBuffer = Buffer.from(candidate, 'utf8');
      return (
        candidateBuffer.length === expectedBuffer.length &&
        timingSafeEqual(candidateBuffer, expectedBuffer)
      );
    });
    return { valid, timestamp };
  }

  private mapWebhookStatus(
    eventName: string,
  ): IdentityVerificationStatus | null {
    if (eventName === 'inquiry.approved') return 'approved';
    if (eventName === 'inquiry.declined' || eventName === 'inquiry.failed') {
      return 'failed';
    }
    if (eventName === 'inquiry.expired') return 'expired';
    if (eventName === 'inquiry.marked-for-review') return 'needs_review';
    if (eventName === 'inquiry.started' || eventName === 'inquiry.completed') {
      return 'pending';
    }
    return null;
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Persona identity verification is not configured',
      );
    }
  }
}
