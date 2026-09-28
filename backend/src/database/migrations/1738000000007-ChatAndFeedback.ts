import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';
import { migrationDateTimeType } from '../migration-column-types';

export class ChatAndFeedback1738000000007 implements MigrationInterface {
  name = 'ChatAndFeedback1738000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dateTime = migrationDateTimeType(queryRunner);
    await queryRunner.createTable(
      new Table({
        name: 'chat_messages',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'eventId', type: 'text', isNullable: false },
          { name: 'authorSub', type: 'text', isNullable: false },
          { name: 'body', type: 'text', isNullable: false },
          { name: 'deletedAt', type: dateTime, isNullable: true },
          { name: 'deletedByHostId', type: 'text', isNullable: true },
          { name: 'createdAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'chat_messages',
      new TableIndex({
        name: 'IDX_chat_messages_event_created',
        columnNames: ['eventId', 'createdAt'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'event_feedback',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'eventId', type: 'text', isNullable: false },
          { name: 'userSub', type: 'text', isNullable: false },
          { name: 'rating', type: 'integer', isNullable: false },
          { name: 'comment', type: 'text', isNullable: true },
          {
            name: 'anonymous',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          { name: 'createdAt', type: dateTime, isNullable: false },
          { name: 'updatedAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'event_feedback',
      new TableIndex({
        name: 'IDX_event_feedback_event_user',
        columnNames: ['eventId', 'userSub'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('event_feedback', true);
    await queryRunner.dropTable('chat_messages', true);
  }
}
