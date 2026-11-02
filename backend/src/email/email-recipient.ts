import { BadRequestException } from '@nestjs/common';

const EMAIL_MAX_LEN = 254;
const SIMPLE_EMAIL =
  /^[^\s@<>()[\],;:\\/]+@[^\s@<>()[\],;:\\/]+\.[^\s@<>()[\],;:\\/]+$/;

/** Single recipient only; rejects header injection and multi-recipient strings. */
export function normalizeAndValidateRecipient(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed || trimmed.length > EMAIL_MAX_LEN) {
    throw new BadRequestException('Invalid recipient');
  }
  if (/[\r\n,;<>]/.test(trimmed)) {
    throw new BadRequestException('Invalid recipient');
  }
  const email = trimmed.toLowerCase();
  if (!SIMPLE_EMAIL.test(email)) {
    throw new BadRequestException('Invalid recipient');
  }
  return email;
}
