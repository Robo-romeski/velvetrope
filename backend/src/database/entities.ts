import { EventEntity } from '../events/event.entity';
import { ApplicationEntity } from '../applications/application.entity';
import { ApplicationFormEntity } from '../applications/application-form.entity';
import { InviteEntity } from '../invites/invite.entity';
import { CheckinTicketEntity } from '../checkin/checkin-ticket.entity';
import { StripeAccountEntity } from '../stripe/stripe-account.entity';
import { EventPaymentEntity } from '../stripe/event-payment.entity';
import { UserEntity } from '../auth/user.entity';
import { TrustReportEntity } from '../trust/report.entity';
import { AdminAuditEntity } from '../admin/admin-audit.entity';
import { CheckinPhotoEntity } from '../checkin/checkin-photo.entity';
import { ChatMessageEntity } from '../chat/chat-message.entity';
import { EventFeedbackEntity } from '../feedback/event-feedback.entity';
import { IdentityVerificationEntity } from '../identity/identity-verification.entity';

export const entities = [
  EventEntity,
  ApplicationEntity,
  ApplicationFormEntity,
  InviteEntity,
  CheckinTicketEntity,
  StripeAccountEntity,
  EventPaymentEntity,
  UserEntity,
  TrustReportEntity,
  AdminAuditEntity,
  CheckinPhotoEntity,
  ChatMessageEntity,
  EventFeedbackEntity,
  IdentityVerificationEntity,
];
