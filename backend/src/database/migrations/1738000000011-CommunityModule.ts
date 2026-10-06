import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';
import {
  applyPostgresUuidIdDefaults,
  migrationDateTimeType,
} from '../migration-column-types';

const UUID_ID = { name: 'id', type: 'varchar', isPrimary: true } as const;

export class CommunityModule1738000000011 implements MigrationInterface {
  name = 'CommunityModule1738000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dateTime = migrationDateTimeType(queryRunner);

    await queryRunner.createTable(
      new Table({
        name: 'member_profiles',
        columns: [
          { name: 'userId', type: 'text', isPrimary: true },
          { name: 'slug', type: 'text', isNullable: false },
          { name: 'displayName', type: 'text', isNullable: true },
          { name: 'bio', type: 'text', isNullable: true },
          { name: 'interests', type: 'text', isNullable: false },
          { name: 'links', type: 'text', isNullable: false },
          { name: 'avatarUrl', type: 'text', isNullable: true },
          { name: 'visibility', type: 'text', isNullable: false },
          { name: 'createdAt', type: dateTime, isNullable: false },
          { name: 'updatedAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'member_profiles',
      new TableIndex({
        name: 'IDX_member_profiles_slug',
        columnNames: ['slug'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'member_blocks',
        columns: [
          UUID_ID,
          { name: 'blockerId', type: 'text', isNullable: false },
          { name: 'blockedId', type: 'text', isNullable: false },
          { name: 'createdAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'member_blocks',
      new TableIndex({
        name: 'IDX_member_blocks_pair',
        columnNames: ['blockerId', 'blockedId'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'member_follows',
        columns: [
          UUID_ID,
          { name: 'followerId', type: 'text', isNullable: false },
          { name: 'followingId', type: 'text', isNullable: false },
          { name: 'createdAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'member_follows',
      new TableIndex({
        name: 'IDX_member_follows_pair',
        columnNames: ['followerId', 'followingId'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'community_groups',
        columns: [
          UUID_ID,
          { name: 'slug', type: 'text', isNullable: false },
          { name: 'name', type: 'text', isNullable: false },
          { name: 'description', type: 'text', isNullable: true },
          {
            name: 'privacy',
            type: 'text',
            isNullable: false,
            default: "'public'",
          },
          { name: 'ownerId', type: 'text', isNullable: false },
          { name: 'createdAt', type: dateTime, isNullable: false },
          { name: 'updatedAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'community_groups',
      new TableIndex({
        name: 'IDX_community_groups_slug',
        columnNames: ['slug'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'group_memberships',
        columns: [
          UUID_ID,
          { name: 'groupId', type: 'text', isNullable: false },
          { name: 'userId', type: 'text', isNullable: false },
          {
            name: 'role',
            type: 'text',
            isNullable: false,
            default: "'member'",
          },
          { name: 'joinedAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'group_memberships',
      new TableIndex({
        name: 'IDX_group_memberships_pair',
        columnNames: ['groupId', 'userId'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'group_posts',
        columns: [
          UUID_ID,
          { name: 'groupId', type: 'text', isNullable: false },
          { name: 'authorId', type: 'text', isNullable: false },
          { name: 'title', type: 'text', isNullable: true },
          { name: 'body', type: 'text', isNullable: false },
          { name: 'createdAt', type: dateTime, isNullable: false },
          { name: 'updatedAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'group_posts',
      new TableIndex({
        name: 'IDX_group_posts_group_created',
        columnNames: ['groupId', 'createdAt'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'post_comments',
        columns: [
          UUID_ID,
          { name: 'postId', type: 'text', isNullable: false },
          { name: 'authorId', type: 'text', isNullable: false },
          { name: 'body', type: 'text', isNullable: false },
          { name: 'createdAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'post_comments',
      new TableIndex({
        name: 'IDX_post_comments_post_created',
        columnNames: ['postId', 'createdAt'],
      }),
    );

    await applyPostgresUuidIdDefaults(queryRunner, [
      'member_blocks',
      'member_follows',
      'community_groups',
      'group_memberships',
      'group_posts',
      'post_comments',
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('post_comments', true);
    await queryRunner.dropTable('group_posts', true);
    await queryRunner.dropTable('group_memberships', true);
    await queryRunner.dropTable('community_groups', true);
    await queryRunner.dropTable('member_follows', true);
    await queryRunner.dropTable('member_blocks', true);
    await queryRunner.dropTable('member_profiles', true);
  }
}
