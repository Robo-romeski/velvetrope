import { UnauthorizedException } from '@nestjs/common';

export type AuthUser = {
  sub: string;
  roles: string[];
};

export function getAuthUser(req: unknown): AuthUser {
  const user = (req as { user?: Partial<AuthUser> | null }).user;
  const sub = user?.sub;
  if (!sub) {
    throw new UnauthorizedException();
  }
  return { sub, roles: user?.roles ?? [] };
}
