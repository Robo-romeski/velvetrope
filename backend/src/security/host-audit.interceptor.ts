import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap } from 'rxjs';

const HOST_MUTATION_PATTERNS: RegExp[] = [
  /^\/events$/,
  /^\/events\/[^/]+$/,
  /^\/events\/[^/]+\/(publish|cancel)$/,
  /^\/applications\/[^/]+\/decision$/,
  /^\/applications\/event\/[^/]+\/form$/,
  /^\/invites\/generate\/[^/]+$/,
  /^\/checkin\/(verify|issue)\//,
];

@Injectable()
export class HostAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HostAudit');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method?: string;
      url?: string;
      user?: { sub?: string; roles?: string[] };
    }>();

    const method = req.method ?? 'GET';
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const path = (req.url ?? '').split('?')[0] ?? '';
    if (!HOST_MUTATION_PATTERNS.some((pattern) => pattern.test(path))) {
      return next.handle();
    }

    const payload = {
      sub: req.user?.sub ?? 'unknown',
      roles: req.user?.roles ?? [],
      method,
      path,
    };

    return next.handle().pipe(
      tap(() => {
        this.logger.log(JSON.stringify({ ...payload, outcome: 'success' }));
      }),
      catchError((error: unknown) => {
        this.logger.warn(JSON.stringify({ ...payload, outcome: 'failure' }));
        throw error;
      }),
    );
  }
}
