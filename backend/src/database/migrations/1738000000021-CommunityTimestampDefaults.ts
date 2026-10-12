import { MigrationInterface, QueryRunner } from 'typeorm';

const GENERATED_TIMESTAMP_COLUMNS = [
  ['member_profiles', 'createdAt'],
  ['member_profiles', 'updatedAt'],
  ['member_blocks', 'createdAt'],
  ['member_follows', 'createdAt'],
  ['community_groups', 'createdAt'],
  ['community_groups', 'updatedAt'],
  ['group_memberships', 'joinedAt'],
  ['group_posts', 'createdAt'],
  ['group_posts', 'updatedAt'],
  ['post_comments', 'createdAt'],
  ['social_activity_reads', 'updatedAt'],
] as const;

export class CommunityTimestampDefaults1738000000021
  implements MigrationInterface
{
  name = 'CommunityTimestampDefaults1738000000021';

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
