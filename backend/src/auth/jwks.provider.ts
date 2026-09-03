import { ConfigService } from '@nestjs/config';
import { buildRemoteJwks } from './jwks';

export const JWKS = 'JWKS';

export const jwksProvider = {
  provide: JWKS,
  useFactory: (config: ConfigService) => {
    const issuer = config.get<string>('AUTH0_ISSUER');
    if (!issuer) {
      throw new Error('AUTH0_ISSUER is not configured');
    }
    return buildRemoteJwks(issuer);
  },
  inject: [ConfigService],
};
