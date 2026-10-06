import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';
import {
  applyPostgresUuidIdDefaults,
  migrationDateTimeType,
} from '../migration-column-types';

const UUID_ID = { name: 'id', type: 'varchar', isPrimary: true } as const;

export class KudosModule1738000000014 implements MigrationInterface {
  name = 'KudosModule1738000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dateTime = migrationDateTimeType(queryRunner);

    await queryRunner.createTable(
      new Table({
        name: 'member_kudos',
        columns: [
          UUID_ID,
          { name: 'giverId', type: 'text', isNullable: false },
          { name: 'recipientId', type: 'text', isNullable: false },
          { name: 'kudoType', type: 'text', isNullable: false },
          {
            name: 'status',
            type: 'text',
            isNullable: false,
            default: "'pending'",
          },
          { name: 'message', type: 'text', isNullable: true },
          { name: 'contextType', type: 'text', isNullable: true },
          { name: 'contextId', type: 'text', isNullable: true },
          {
            name: 'contextVerified',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          { name: 'createdAt', type: dateTime, isNullable: false },
          { name: 'updatedAt', type: dateTime, isNullable: false },
          { name: 'approvedAt', type: dateTime, isNullable: true },
        ],
      }),
      true,
    );

    await applyPostgresUuidIdDefaults(queryRunner, ['member_kudos']);

    await queryRunner.createIndex(
      'member_kudos',
      new TableIndex({
        name: 'IDX_member_kudos_recipient_status',
        columnNames: ['recipientId', 'status'],
      }),
    );
    await queryRunner.createIndex(
      'member_kudos',
      new TableIndex({
        name: 'IDX_member_kudos_giver_created',
        columnNames: ['giverId', 'createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('member_kudos', true);
  }
}
