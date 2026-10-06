import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import {
  AUTH_AUDIENCE,
  AUTH_ISSUER,
  resolveAuthSecret,
} from './auth.constants';
import { DataSource } from 'typeorm';
import { UserEntity } from './user.entity';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  private joseModule: typeof import('jose') | null = null;

  constructor(private readonly dataSource: DataSource) {}

  private async getJose() {
    if (!this.joseModule) {
      this.joseModule = await import('jose');
    }
    return this.joseModule;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    if (process.env.NODE_ENV === 'test') {
      const testHeader = req.headers['x-test-roles'] as string | undefined;
      if (testHeader) {
        let roles: string[] = [];
        try {
          const parsed = JSON.parse(testHeader);
          if (Array.isArray(parsed)) roles = parsed as string[];
        } catch {
          roles = testHeader
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
        }
        const testSub =
          (req.headers['x-test-sub'] as string | undefined) || 'test-user';
        req.user = { sub: testSub, roles };
        return true;
      }
    }

    const auth = req.headers['authorization'] as string | undefined;
    if (!auth?.startsWith('Bearer ')) {
      return true;
    }
    const token = auth.substring('Bearer '.length).trim();
    if (!token) return true;

    const { jwtVerify } = await this.getJose();
    try {
      const result = await jwtVerify(
        token,
        new TextEncoder().encode(resolveAuthSecret()),
        {
          issuer: AUTH_ISSUER,
          audience: AUTH_AUDIENCE,
        },
      );
      const sub = String(result.payload.sub ?? '');
      if (!sub) return true;
      const user = await this.dataSource
        .getRepository(UserEntity)
        .findOne({ where: { id: sub } });
      if (!user || user.accountStatus === 'suspended') {
        return true;
      }
      req.user = {
        sub: user.id,
        roles: user.roles,
        email: user.email,
      };
    } catch {
      // Anonymous viewer
    }
    return true;
  }
}
