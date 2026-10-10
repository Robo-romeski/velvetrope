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

export class EducationModule1738000000012 implements MigrationInterface {
  name = 'EducationModule1738000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dateTime = migrationDateTimeType(queryRunner);

    await queryRunner.addColumn(
      'member_profiles',
      new TableColumn({
        name: 'educator',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'educational_contents',
        columns: [
          UUID_ID,
          { name: 'creatorId', type: 'text', isNullable: false },
          { name: 'slug', type: 'text', isNullable: false },
          { name: 'title', type: 'text', isNullable: false },
          { name: 'summary', type: 'text', isNullable: true },
          { name: 'contentType', type: 'text', isNullable: false },
          {
            name: 'status',
            type: 'text',
            isNullable: false,
            default: "'draft'",
          },
          { name: 'tags', type: 'text', isNullable: false },
          { name: 'groupId', type: 'text', isNullable: true },
          { name: 'externalUrl', type: 'text', isNullable: true },
          { name: 'publishedAt', type: dateTime, isNullable: true },
          { name: 'createdAt', type: dateTime, isNullable: false },
          { name: 'updatedAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'educational_contents',
      new TableIndex({
        name: 'IDX_educational_contents_slug',
        columnNames: ['slug'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'education_lessons',
        columns: [
          UUID_ID,
          { name: 'contentId', type: 'text', isNullable: false },
          { name: 'sortOrder', type: 'integer', isNullable: false, default: 0 },
          { name: 'title', type: 'text', isNullable: false },
          { name: 'body', type: 'text', isNullable: false },
          {
            name: 'isPreview',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          { name: 'createdAt', type: dateTime, isNullable: false },
          { name: 'updatedAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'education_lessons',
      new TableIndex({
        name: 'IDX_education_lessons_content_order',
        columnNames: ['contentId', 'sortOrder'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'lesson_progress',
        columns: [
          UUID_ID,
          { name: 'userId', type: 'text', isNullable: false },
          { name: 'contentId', type: 'text', isNullable: false },
          { name: 'lessonId', type: 'text', isNullable: false },
          { name: 'completedAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'lesson_progress',
      new TableIndex({
        name: 'IDX_lesson_progress_user_lesson',
        columnNames: ['userId', 'lessonId'],
        isUnique: true,
      }),
    );

    await applyPostgresUuidIdDefaults(queryRunner, [
      'educational_contents',
      'education_lessons',
      'lesson_progress',
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('lesson_progress', true);
    await queryRunner.dropTable('education_lessons', true);
    await queryRunner.dropTable('educational_contents', true);
    await queryRunner.dropColumn('member_profiles', 'educator');
  }
}
