export const KUDO_TYPES = [
  'welcoming',
  'knowledge_sharing',
  'respectful_communication',
  'event_contribution',
] as const;

export type KudoType = (typeof KUDO_TYPES)[number];

export type KudoStatus =
  | 'pending'
  | 'approved'
  | 'hidden_by_giver'
  | 'hidden_by_recipient'
  | 'suppressed';

export type KudoContextType = 'event' | 'course' | 'group';

export const KUDO_TYPE_LABELS: Record<KudoType, string> = {
  welcoming: 'Welcoming',
  knowledge_sharing: 'Knowledge sharing',
  respectful_communication: 'Respectful communication',
  event_contribution: 'Event contribution',
};

export const MAX_KUDOS_PER_DAY = 10;
export const PAIR_TYPE_COOLDOWN_DAYS = 30;
export const RECIPROCAL_WINDOW_DAYS = 7;
