import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
} from 'typeorm';
import { migrationDateTimeType } from '../migration-column-types';

export class SocialHome1738000000017 implements MigrationInterface {
  name = 'SocialHome1738000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dateTime = migrationDateTimeType(queryRunner);

    await queryRunner.changeColumn(
      'group_posts',
      'groupId',
      new TableColumn({
        name: 'groupId',
        type: 'text',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'group_posts',
      new TableColumn({
        name: 'audience',
        type: 'text',
        isNullable: false,
        default: "'group'",
      }),
    );
    await queryRunner.addColumn(
      'group_posts',
      new TableColumn({
        name: 'linkUrl',
        type: 'text',
        isNullable: true,
      }),
    );
    await queryRunner.createIndex(
      'group_posts',
      new TableIndex({
        name: 'IDX_group_posts_author_created',
        columnNames: ['authorId', 'createdAt'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'social_activity_reads',
        columns: [
          { name: 'userId', type: 'text', isPrimary: true },
          { name: 'lastReadAt', type: dateTime, isNullable: true },
          { name: 'updatedAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('social_activity_reads', true);
    await queryRunner.dropIndex(
      'group_posts',
      'IDX_group_posts_author_created',
    );
    await queryRunner.query(
      'DELETE FROM "post_comments" WHERE "postId" IN (SELECT "id" FROM "group_posts" WHERE "groupId" IS NULL)',
    );
    await queryRunner.query(
      'DELETE FROM "group_posts" WHERE "groupId" IS NULL',
    );
    await queryRunner.dropColumn('group_posts', 'linkUrl');
    await queryRunner.dropColumn('group_posts', 'audience');
    await queryRunner.changeColumn(
      'group_posts',
      'groupId',
      new TableColumn({
        name: 'groupId',
        type: 'text',
        isNullable: false,
      }),
    );
  }
}
