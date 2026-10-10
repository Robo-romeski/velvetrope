import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
} from 'typeorm';
import {
  applyPostgresUuidIdDefaults,
  migrationDateTimeType,
} from '../migration-column-types';

const UUID_ID = { name: 'id', type: 'varchar', isPrimary: true } as const;

export class DirectMessaging1738000000016 implements MigrationInterface {
  name = 'DirectMessaging1738000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dateTime = migrationDateTimeType(queryRunner);

    await queryRunner.addColumn(
      'member_profiles',
      new TableColumn({
        name: 'messagePermission',
        type: 'text',
        isNullable: false,
        default: "'following'",
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'direct_conversations',
        columns: [
          UUID_ID,
          { name: 'participantAId', type: 'text', isNullable: false },
          { name: 'participantBId', type: 'text', isNullable: false },
          { name: 'participantAReadAt', type: dateTime, isNullable: true },
          { name: 'participantBReadAt', type: dateTime, isNullable: true },
          { name: 'lastMessageAt', type: dateTime, isNullable: true },
          { name: 'createdAt', type: dateTime, isNullable: false },
          { name: 'updatedAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'direct_conversations',
      new TableIndex({
        name: 'UQ_direct_conversations_participants',
        columnNames: ['participantAId', 'participantBId'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'direct_conversations',
      new TableIndex({
        name: 'IDX_direct_conversations_a_last',
        columnNames: ['participantAId', 'lastMessageAt'],
      }),
    );
    await queryRunner.createIndex(
      'direct_conversations',
      new TableIndex({
        name: 'IDX_direct_conversations_b_last',
        columnNames: ['participantBId', 'lastMessageAt'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'direct_messages',
        columns: [
          UUID_ID,
          { name: 'conversationId', type: 'text', isNullable: false },
          { name: 'senderId', type: 'text', isNullable: false },
          { name: 'body', type: 'text', isNullable: false },
          { name: 'createdAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'direct_messages',
      new TableIndex({
        name: 'IDX_direct_messages_conversation_created',
        columnNames: ['conversationId', 'createdAt'],
      }),
    );

    await applyPostgresUuidIdDefaults(queryRunner, [
      'direct_conversations',
      'direct_messages',
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('direct_messages', true);
    await queryRunner.dropTable('direct_conversations', true);
    await queryRunner.dropColumn('member_profiles', 'messagePermission');
  }
}
