import { MigrationInterface, QueryRunner } from 'typeorm';

const GENERATED_TIMESTAMP_COLUMNS = [
  ['educational_contents', 'createdAt'],
  ['educational_contents', 'updatedAt'],
  ['education_lessons', 'createdAt'],
  ['education_lessons', 'updatedAt'],
  ['lesson_progress', 'completedAt'],
  ['course_reviews', 'createdAt'],
  ['course_reviews', 'updatedAt'],
] as const;

export class EducationTimestampDefaults1738000000023
  implements MigrationInterface
{
  name = 'EducationTimestampDefaults1738000000023';

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
