import type { Request } from 'express';

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim().slice(0, 64);
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).trim().slice(0, 64);
  }
  return (req.ip ?? 'unknown').slice(0, 64);
}
