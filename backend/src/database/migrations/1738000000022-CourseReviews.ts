import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';
import { migrationDateTimeType } from '../migration-column-types';

export class CourseReviews1738000000022 implements MigrationInterface {
  name = 'CourseReviews1738000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dateTime = migrationDateTimeType(queryRunner);
    await queryRunner.createTable(
      new Table({
        name: 'course_reviews',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'contentId', type: 'text', isNullable: false },
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
      'course_reviews',
      new TableIndex({
        name: 'IDX_course_reviews_content_user',
        columnNames: ['contentId', 'userSub'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('course_reviews', true);
  }
}
