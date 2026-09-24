import { join } from 'path';
import type { DataSourceOptions } from 'typeorm';
import { entities } from './entities';

export function buildTypeOrmOptions(): DataSourceOptions {
  const isTest = process.env.NODE_ENV === 'test';
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const usePostgres = Boolean(databaseUrl);

  const migrations = [join(__dirname, 'migrations', '*.{js,ts}')];

  if (usePostgres) {
    return {
      type: 'postgres',
      url: databaseUrl,
      entities,
      synchronize: false,
      migrations,
      migrationsRun: !isTest,
    };
  }

  return {
    type: 'sqlite',
    database:
      process.env.DATABASE_PATH ||
      (isTest ? ':memory:' : 'data/dev.sqlite'),
    entities,
    synchronize: isTest,
    migrations,
    migrationsRun: !isTest,
  };
}
