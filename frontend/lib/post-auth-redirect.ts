/** Default landing for members after sign-in when no explicit `next` is provided. */
export const DEFAULT_MEMBER_LANDING = '/feed';

/** Validates `next` query param; sends members to the community feed by default. */
export function safePostAuthPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return DEFAULT_MEMBER_LANDING;
  }
  if (value === '/') {
    return DEFAULT_MEMBER_LANDING;
  }
  return value;
}
