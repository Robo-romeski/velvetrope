import { MigrationInterface, QueryRunner } from 'typeorm';
import { applyPostgresUuidIdDefaults } from '../migration-column-types';

export class CourseReviewUuidDefault1738000000024
  implements MigrationInterface
{
  name = 'CourseReviewUuidDefault1738000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await applyPostgresUuidIdDefaults(queryRunner, ['course_reviews']);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.options.type !== 'postgres') return;
    await queryRunner.query(
      `ALTER TABLE "course_reviews" ALTER COLUMN "id" DROP DEFAULT`,
    );
  }
}
