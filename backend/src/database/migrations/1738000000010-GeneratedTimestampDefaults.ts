import { MigrationInterface, QueryRunner } from 'typeorm';

const GENERATED_TIMESTAMP_COLUMNS = [
  ['application_forms', 'updatedAt'],
  ['applications', 'createdAt'],
  ['invites', 'createdAt'],
  ['checkin_tickets', 'issuedAt'],
  ['stripe_accounts', 'createdAt'],
  ['stripe_accounts', 'updatedAt'],
  ['event_payments', 'createdAt'],
  ['trust_reports', 'createdAt'],
  ['admin_audit_log', 'createdAt'],
  ['checkin_photos', 'createdAt'],
  ['chat_messages', 'createdAt'],
  ['event_feedback', 'createdAt'],
  ['event_feedback', 'updatedAt'],
  ['identity_verifications', 'createdAt'],
  ['identity_verifications', 'updatedAt'],
] as const;

export class GeneratedTimestampDefaults1738000000010
  implements MigrationInterface
{
  name = 'GeneratedTimestampDefaults1738000000010';

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
