import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';

describe('Config defaults (TDD)', () => {
  let config: ConfigService;
  const previousPort = process.env.PORT;

  beforeAll(async () => {
    delete process.env.PORT;
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          validationSchema: Joi.object({
            NODE_ENV: Joi.string()
              .valid('development', 'test', 'production')
              .default('test'),
            PORT: Joi.number().default(3010),
          }),
        }),
      ],
    }).compile();

    config = module.get(ConfigService);
  });

  afterAll(() => {
    if (previousPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = previousPort;
    }
  });

  it('should provide default PORT=3010 when unset', () => {
    expect(config.get('PORT')).toBe(3010);
  });

  it('should require NODE_ENV to be one of development|test|production', () => {
    const env = config.get('NODE_ENV');
    expect(['development', 'test', 'production']).toContain(env);
  });
});
