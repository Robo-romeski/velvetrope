import type { QueryRunner } from 'typeorm';

export function migrationDateTimeType(
  queryRunner: QueryRunner,
): 'timestamptz' | 'datetime' {
  return queryRunner.connection.options.type === 'postgres'
    ? 'timestamptz'
    : 'datetime';
}

/** Match GeneratedUuidDefaults1738000000009 — TypeORM uuid generationStrategy breaks on Postgres. */
export async function applyPostgresUuidIdDefaults(
  queryRunner: QueryRunner,
  tables: readonly string[],
): Promise<void> {
  if (queryRunner.connection.options.type !== 'postgres') return;
  for (const table of tables) {
    await queryRunner.query(
      `ALTER TABLE "${table}" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text`,
    );
  }
}
