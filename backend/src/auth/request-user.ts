import { UnauthorizedException } from '@nestjs/common';

export type AuthUser = {
  sub: string;
  roles: string[];
  email?: string;
};

export function getAuthUser(req: unknown): AuthUser {
  const user = (req as { user?: Partial<AuthUser> | null }).user;
  const sub = user?.sub;
  if (!sub) {
    throw new UnauthorizedException();
  }
  return { sub, roles: user?.roles ?? [], email: user?.email };
}

export function getOptionalAuthUser(req: unknown): AuthUser | null {
  const user = (req as { user?: Partial<AuthUser> | null }).user;
  const sub = user?.sub;
  if (!sub) return null;
  return { sub, roles: user?.roles ?? [], email: user?.email };
}
