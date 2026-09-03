import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';

describe('Config defaults (TDD)', () => {
  let config: ConfigService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validationSchema: Joi.object({
            NODE_ENV: Joi.string().valid('development', 'test', 'production').default('test'),
            PORT: Joi.number().default(3000),
          }),
        }),
      ],
    }).compile();

    config = module.get(ConfigService);
  });

  it('should provide default PORT=3000 when unset', () => {
    expect(config.get('PORT')).toBe(3000);
  });

  it('should require NODE_ENV to be one of development|test|production', () => {
    const env = config.get('NODE_ENV');
    expect(['development', 'test', 'production']).toContain(env);
  });
});
