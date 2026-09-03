import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildRemoteJwks } from './jwks';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwks: ReturnType<typeof buildRemoteJwks> | null = null;
  private joseModule: typeof import('jose') | null = null;

  constructor(private readonly config: ConfigService) {}

  private async getJose() {
    if (!this.joseModule) {
      this.joseModule = await import('jose');
    }
    return this.joseModule;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'] as string | undefined;
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = auth.substring('Bearer '.length);

    const issuer = this.config.get<string>('AUTH0_ISSUER');
    const audience = this.config.get<string>('AUTH0_AUDIENCE');
    if (!issuer || !audience) {
      throw new UnauthorizedException();
    }

    // Test-only convenience path: allow overriding roles/sub to simplify e2e
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
            .map((s) => s.trim())
            .filter(Boolean);
        }
        const testSub =
          (req.headers['x-test-sub'] as string | undefined) || 'test-user';
        req.user = { sub: testSub, roles };
        return true;
      }
    }

    if (!this.jwks) {
      this.jwks = buildRemoteJwks(issuer);
    }

    const { jwtVerify } = await this.getJose();

    try {
      const result = await jwtVerify(token, this.jwks as any, {
        issuer,
        audience,
      });
      // Attach roles if present in custom claim or standard claim fallback
      const claims: any = result.payload as any;
      let roles =
        (claims['https://epicsexual.com/roles'] as string[] | undefined) ||
        (claims['roles'] as string[] | undefined) ||
        [];
      // Test convenience: allow overriding roles via header in test env
      if (process.env.NODE_ENV === 'test') {
        const testHeader = req.headers['x-test-roles'] as string | undefined;
        if (testHeader) {
          try {
            const parsed = JSON.parse(testHeader);
            if (Array.isArray(parsed)) roles = parsed as string[];
          } catch {
            roles = testHeader
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
          }
        }
      }
      req.user = { ...(claims || {}), roles };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
