import { randomBytes } from 'crypto';

export function randomToken(length: number, alphabet: string): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}
