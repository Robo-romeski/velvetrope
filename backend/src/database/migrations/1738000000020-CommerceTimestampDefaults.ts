import { MigrationInterface, QueryRunner } from 'typeorm';

const GENERATED_TIMESTAMP_COLUMNS = [
  ['commerce_orders', 'createdAt'],
  ['commerce_refunds', 'createdAt'],
  ['commerce_entitlements', 'grantedAt'],
] as const;

export class CommerceTimestampDefaults1738000000020
  implements MigrationInterface
{
  name = 'CommerceTimestampDefaults1738000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.options.type !== 'postgres') return;

    for (const [table, column] of GENERATED_TIMESTAMP_COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" SET DEFAULT CURRENT_TIMESTAMP`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.options.type !== 'postgres') return;

    for (const [table, column] of GENERATED_TIMESTAMP_COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP DEFAULT`,
      );
    }
  }
}
