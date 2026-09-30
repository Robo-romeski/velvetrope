import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
} from 'typeorm';
import { migrationDateTimeType } from '../migration-column-types';

export class PhotoCheckin1738000000006 implements MigrationInterface {
  name = 'PhotoCheckin1738000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dateTime = migrationDateTimeType(queryRunner);
    await queryRunner.addColumn(
      'events',
      new TableColumn({
        name: 'requirePhotoCheckin',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'checkin_photos',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'eventId', type: 'text', isNullable: false },
          { name: 'userSub', type: 'text', isNullable: false },
          { name: 'objectKey', type: 'text', isNullable: false },
          { name: 'contentType', type: 'text', isNullable: false },
          { name: 'sizeBytes', type: 'integer', isNullable: false },
          { name: 'uploadedAt', type: dateTime, isNullable: true },
          { name: 'verifiedAt', type: dateTime, isNullable: true },
          { name: 'verifiedByHostId', type: 'text', isNullable: true },
          { name: 'expiresAt', type: dateTime, isNullable: false },
          { name: 'createdAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'checkin_photos',
      new TableIndex({
        name: 'IDX_checkin_photos_event_user',
        columnNames: ['eventId', 'userSub'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('checkin_photos', true);
    await queryRunner.dropColumn('events', 'requirePhotoCheckin');
  }
}
