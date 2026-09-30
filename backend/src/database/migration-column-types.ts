import type { QueryRunner } from 'typeorm';

export function migrationDateTimeType(
  queryRunner: QueryRunner,
): 'timestamptz' | 'datetime' {
  return queryRunner.connection.options.type === 'postgres'
    ? 'timestamptz'
    : 'datetime';
}
