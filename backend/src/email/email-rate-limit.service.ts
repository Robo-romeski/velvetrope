import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

type Bucket = { count: number; resetAt: number };

@Injectable()
export class EmailRateLimitService {
  private readonly buckets = new Map<string, Bucket>();

  /** Throws 429 when limit exceeded within windowMs. */
  assertAllowed(key: string, limit: number, windowMs: number): void {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    if (bucket.count >= limit) {
      throw new HttpException(
        'Too many email requests. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    bucket.count += 1;
  }

  /** Test helper */
  resetAll(): void {
    this.buckets.clear();
  }
}
