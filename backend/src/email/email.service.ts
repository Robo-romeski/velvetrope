import { Injectable, Logger } from '@nestjs/common';
import {
  resolveEmailFrom,
  resolveResendApiKey,
  shouldCaptureEmail,
} from './email.config';
import { captureEmail } from './email-outbox';
import {
  applicationDecisionEmail,
  passwordResetEmail,
} from './email.templates';

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendPasswordReset(input: {
    to: string;
    resetToken: string;
  }): Promise<void> {
    const content = passwordResetEmail({ resetToken: input.resetToken });
    await this.send({
      to: input.to,
      ...content,
    });
  }

  async sendApplicationDecision(input: {
    to: string;
    eventTitle: string;
    eventId: string;
    status: 'approved' | 'rejected';
    reason?: string;
  }): Promise<void> {
    const content = applicationDecisionEmail({
      eventTitle: input.eventTitle,
      eventId: input.eventId,
      status: input.status,
      reason: input.reason,
    });
    await this.send({
      to: input.to,
      ...content,
    });
  }

  async send(input: SendEmailInput): Promise<void> {
    const to = input.to.trim();
    if (!to) return;

    if (shouldCaptureEmail()) {
      captureEmail({
        to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      if (process.env.NODE_ENV !== 'test') {
        this.logger.log(`Email captured for ${to}: ${input.subject}`);
      }
      return;
    }

    const apiKey = resolveResendApiKey();
    if (!apiKey) {
      captureEmail({
        to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resolveEmailFrom(),
        to: [to],
        subject: input.subject,
        text: input.text,
        html: input.html ?? undefined,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(
        `Resend failed (${response.status}) for ${to}: ${body.slice(0, 200)}`,
      );
      throw new Error(`Email delivery failed (${response.status})`);
    }
  }
}
