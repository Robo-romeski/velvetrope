import { Injectable, Logger } from '@nestjs/common';
import {
  assertProductionEmailFromConfigured,
  resolveEmailFrom,
  resolveResendApiKey,
  shouldCaptureEmail,
} from './email.config';
import { captureEmail } from './email-outbox';
import {
  applicationDecisionEmail,
  passwordResetEmail,
} from './email.templates';
import { normalizeAndValidateRecipient } from './email-recipient';
import { clampEmailContent } from './email-content-limits';
import { EmailRateLimitService } from './email-rate-limit.service';

type OutboundKind = 'password_reset' | 'application_decision' | 'trust_report';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly rateLimit: EmailRateLimitService) {}

  async sendPasswordReset(input: {
    to: string;
    resetToken: string;
    clientIp?: string;
  }): Promise<void> {
    const to = normalizeAndValidateRecipient(input.to);
    this.rateLimit.assertAllowed(`email:password_reset:${to}`, 3, 3_600_000);
    if (input.clientIp) {
      this.rateLimit.assertAllowed(
        `email:password_reset_ip:${input.clientIp}`,
        15,
        3_600_000,
      );
    }
    const content = passwordResetEmail({ resetToken: input.resetToken });
    await this.deliver({
      kind: 'password_reset',
      to,
      ...content,
    });
  }

  async sendApplicationDecision(input: {
    to: string;
    eventTitle: string;
    eventId: string;
    status: 'approved' | 'waitlisted' | 'rejected';
    reason?: string;
    hostId: string;
    applicationId: string;
  }): Promise<void> {
    const to = normalizeAndValidateRecipient(input.to);
    this.rateLimit.assertAllowed(
      `email:app_decision_host:${input.hostId}`,
      40,
      3_600_000,
    );
    this.rateLimit.assertAllowed(
      `email:app_decision:${input.applicationId}:${input.status}`,
      2,
      86_400_000,
    );
    const content = applicationDecisionEmail({
      eventTitle: input.eventTitle.slice(0, 200),
      eventId: input.eventId,
      status: input.status,
      reason: input.reason?.slice(0, 1000),
    });
    await this.deliver({
      kind: 'application_decision',
      to,
      ...content,
    });
  }

  async sendTrustReportAdminNotification(input: {
    reportId: string;
    category: string;
    subjectType: string;
    subjectId: string;
    reporterSub: string;
    details: string;
  }): Promise<void> {
    const notifyEmail = process.env.TRUST_REPORT_NOTIFY_EMAIL?.trim();
    if (!notifyEmail) return;
    const to = normalizeAndValidateRecipient(notifyEmail);
    this.rateLimit.assertAllowed(
      `email:trust_report:${input.reporterSub}`,
      10,
      3_600_000,
    );
    const details = input.details.trim().slice(0, 4000);
    await this.deliver({
      kind: 'trust_report',
      to,
      subject: `[epicsexual] New trust report (${input.category.slice(0, 80)})`,
      text: [
        `Report id: ${input.reportId}`,
        `Category: ${input.category}`,
        `Subject: ${input.subjectType} ${input.subjectId}`,
        `Reporter sub: ${input.reporterSub}`,
        '',
        details,
      ].join('\n'),
    });
  }

  private async deliver(input: {
    kind: OutboundKind;
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<void> {
    const to = normalizeAndValidateRecipient(input.to);
    const { subject, text, html } = clampEmailContent(input);
    if (!subject || !text) return;

    if (shouldCaptureEmail()) {
      captureEmail({ to, subject, text, html });
      if (process.env.NODE_ENV !== 'test') {
        this.logger.log(`Email captured (${input.kind}) for ${to}: ${subject}`);
      }
      return;
    }

    assertProductionEmailFromConfigured();
    const apiKey = resolveResendApiKey();
    if (!apiKey) {
      captureEmail({ to, subject, text, html });
      return;
    }

    const from = resolveEmailFrom();
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html: html ?? undefined,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(
        `Resend failed (${response.status}) kind=${input.kind} to=${to}: ${body.slice(0, 200)}`,
      );
      throw new Error(`Email delivery failed (${response.status})`);
    }
  }
}
