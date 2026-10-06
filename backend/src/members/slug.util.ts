import { randomBytes } from 'crypto';

export function slugifyBase(input: string): string {
  const base = (input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'member';
}

export function uniqueSlug(base: string): string {
  const suffix = randomBytes(3).toString('hex');
  return `${slugifyBase(base)}-${suffix}`;
}
