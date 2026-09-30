import { MigrationInterface, QueryRunner } from 'typeorm';

const GENERATED_UUID_TABLES = [
  'users',
  'events',
  'application_forms',
  'applications',
  'invites',
  'checkin_tickets',
  'stripe_accounts',
  'event_payments',
  'trust_reports',
  'admin_audit_log',
  'checkin_photos',
  'chat_messages',
  'event_feedback',
  'identity_verifications',
] as const;

export class GeneratedUuidDefaults1738000000009 implements MigrationInterface {
  name = 'GeneratedUuidDefaults1738000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.options.type !== 'postgres') return;

    for (const table of GENERATED_UUID_TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.options.type !== 'postgres') return;

    for (const table of GENERATED_UUID_TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "id" DROP DEFAULT`,
      );
    }
  }
}
