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
import { MemberProfileEntity } from '../members/member-profile.entity';
import { MemberBlockEntity } from '../members/member-block.entity';
import { MemberFollowEntity } from '../members/member-follow.entity';
import { GroupEntity } from '../social/group.entity';
import { GroupMembershipEntity } from '../social/group-membership.entity';
import { GroupPostEntity } from '../social/group-post.entity';
import { PostCommentEntity } from '../social/post-comment.entity';
import { EducationalContentEntity } from '../education/educational-content.entity';
import { EducationLessonEntity } from '../education/education-lesson.entity';
import { LessonProgressEntity } from '../education/lesson-progress.entity';
import { OrderEntity } from '../commerce/order.entity';
import { OrderLineEntity } from '../commerce/order-line.entity';
import { EntitlementEntity } from '../commerce/entitlement.entity';
import { RefundEntity } from '../commerce/refund.entity';
import { MemberKudoEntity } from '../kudos/member-kudo.entity';

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
  MemberProfileEntity,
  MemberBlockEntity,
  MemberFollowEntity,
  GroupEntity,
  GroupMembershipEntity,
  GroupPostEntity,
  PostCommentEntity,
  EducationalContentEntity,
  EducationLessonEntity,
  LessonProgressEntity,
  OrderEntity,
  OrderLineEntity,
  EntitlementEntity,
  RefundEntity,
  MemberKudoEntity,
];
