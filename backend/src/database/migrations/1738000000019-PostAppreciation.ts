import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';
import {
  applyPostgresUuidIdDefaults,
  migrationDateTimeType,
} from '../migration-column-types';

const UUID_ID = { name: 'id', type: 'varchar', isPrimary: true } as const;

export class PostAppreciation1738000000019 implements MigrationInterface {
  name = 'PostAppreciation1738000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dateTime = migrationDateTimeType(queryRunner);

    await queryRunner.createTable(
      new Table({
        name: 'post_appreciations',
        columns: [
          UUID_ID,
          { name: 'postId', type: 'text', isNullable: false },
          { name: 'userId', type: 'text', isNullable: false },
          { name: 'createdAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );

    await applyPostgresUuidIdDefaults(queryRunner, ['post_appreciations']);

    await queryRunner.createIndex(
      'post_appreciations',
      new TableIndex({
        name: 'UQ_post_appreciations_post_user',
        columnNames: ['postId', 'userId'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'post_appreciations',
      new TableIndex({
        name: 'IDX_post_appreciations_user_created',
        columnNames: ['userId', 'createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('post_appreciations', true);
  }
}
