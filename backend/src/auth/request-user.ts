import { UnauthorizedException } from '@nestjs/common';

export type AuthUser = {
  sub: string;
  roles: string[];
};

export function getAuthUser(req: {
  user?: Partial<AuthUser> | null;
}): AuthUser {
  const sub = req.user?.sub;
  if (!sub) {
    throw new UnauthorizedException();
  }
  return { sub, roles: req.user?.roles ?? [] };
}
