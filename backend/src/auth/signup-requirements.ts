/** Bump when Terms/Privacy copy changes; stored on the user record at signup. */
export const CURRENT_TERMS_VERSION = '2026-10-30';

export function assertSignupRequirements(input: {
  confirmedAdult?: boolean;
  acceptedTermsVersion?: string;
}): void {
  if (input.confirmedAdult !== true) {
    throw new Error('ADULT_REQUIRED');
  }
  const version = (input.acceptedTermsVersion ?? '').trim();
  if (version !== CURRENT_TERMS_VERSION) {
    throw new Error('TERMS_VERSION');
  }
}
