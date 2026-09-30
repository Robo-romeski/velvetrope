import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
} from 'typeorm';
import { migrationDateTimeType } from '../migration-column-types';

export class PersonaIdentityVerification1738000000008
  implements MigrationInterface
{
  name = 'PersonaIdentityVerification1738000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dateTime = migrationDateTimeType(queryRunner);
    await queryRunner.addColumn(
      'events',
      new TableColumn({
        name: 'requireIdentityVerification',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
    );
    await queryRunner.createTable(
      new Table({
        name: 'identity_verifications',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'userSub', type: 'text', isNullable: false },
          {
            name: 'provider',
            type: 'text',
            isNullable: false,
            default: "'persona'",
          },
          { name: 'inquiryId', type: 'text', isNullable: true },
          {
            name: 'status',
            type: 'text',
            isNullable: false,
            default: "'not_started'",
          },
          { name: 'verifiedAt', type: dateTime, isNullable: true },
          { name: 'lastWebhookAt', type: dateTime, isNullable: true },
          { name: 'lastWebhookEventId', type: 'text', isNullable: true },
          { name: 'createdAt', type: dateTime, isNullable: false },
          { name: 'updatedAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'identity_verifications',
      new TableIndex({
        name: 'IDX_identity_verifications_user',
        columnNames: ['userSub'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'identity_verifications',
      new TableIndex({
        name: 'IDX_identity_verifications_inquiry',
        columnNames: ['inquiryId'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('identity_verifications', true);
    await queryRunner.dropColumn('events', 'requireIdentityVerification');
  }
}
