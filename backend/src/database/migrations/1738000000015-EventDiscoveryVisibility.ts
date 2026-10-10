import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class EventDiscoveryVisibility1738000000015
  implements MigrationInterface
{
  name = 'EventDiscoveryVisibility1738000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'events',
      new TableColumn({
        name: 'isDiscoveryVisible',
        type: 'boolean',
        isNullable: false,
        default: true,
      }),
    );

    await queryRunner.manager
      .createQueryBuilder()
      .update('events')
      .set({ isDiscoveryVisible: false })
      .where(
        [
          "LOWER(title) = 'demo'",
          "LOWER(title) LIKE 'demo %'",
          "LOWER(title) LIKE '% demo'",
          "LOWER(title) LIKE '% demo %'",
          "LOWER(title) = 'test'",
          "LOWER(title) LIKE 'test %'",
          "LOWER(title) LIKE '% test'",
          "LOWER(title) LIKE '% test %'",
          "LOWER(title) = 'smoke'",
          "LOWER(title) LIKE 'smoke %'",
          "LOWER(title) LIKE '% smoke'",
          "LOWER(title) LIKE '% smoke %'",
          "LOWER(COALESCE(description, '')) LIKE '%test event%'",
          "LOWER(COALESCE(description, '')) LIKE '%demo event%'",
          "LOWER(COALESCE(description, '')) LIKE '%smoke test%'",
        ].join(' OR '),
      )
      .execute();
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('events', 'isDiscoveryVisible');
  }
}
