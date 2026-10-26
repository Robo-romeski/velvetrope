import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
} from 'typeorm';
import {
  applyPostgresUuidIdDefaults,
  migrationDateTimeType,
} from '../migration-column-types';

export class Assets3dLibrary1738000000025 implements MigrationInterface {
  name = 'Assets3dLibrary1738000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dateTime = migrationDateTimeType(queryRunner);
    await queryRunner.createTable(
      new Table({
        name: 'assets_3d',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'slug', type: 'text', isNullable: false },
          { name: 'title', type: 'text', isNullable: false },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'category', type: 'text', isNullable: false },
          { name: 'tags', type: 'text', isNullable: false },
          {
            name: 'status',
            type: 'text',
            isNullable: false,
            default: "'draft'",
          },
          { name: 'modelObjectKey', type: 'text', isNullable: true },
          { name: 'modelContentType', type: 'text', isNullable: true },
          { name: 'modelSizeBytes', type: 'integer', isNullable: true },
          { name: 'modelFilename', type: 'text', isNullable: true },
          { name: 'thumbnailObjectKey', type: 'text', isNullable: true },
          { name: 'thumbnailContentType', type: 'text', isNullable: true },
          { name: 'thumbnailSizeBytes', type: 'integer', isNullable: true },
          { name: 'thumbnailFilename', type: 'text', isNullable: true },
          { name: 'createdBy', type: 'text', isNullable: false },
          { name: 'publishedAt', type: dateTime, isNullable: true },
          {
            name: 'createdAt',
            type: dateTime,
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: dateTime,
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'assets_3d',
      new TableIndex({
        name: 'IDX_assets_3d_slug',
        columnNames: ['slug'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'assets_3d',
      new TableIndex({
        name: 'IDX_assets_3d_status_published',
        columnNames: ['status', 'publishedAt'],
      }),
    );
    await applyPostgresUuidIdDefaults(queryRunner, ['assets_3d']);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('assets_3d', true);
  }
}
