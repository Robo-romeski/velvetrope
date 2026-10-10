import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class PostEventLink1738000000018 implements MigrationInterface {
  name = 'PostEventLink1738000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'group_posts',
      new TableColumn({
        name: 'eventId',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('group_posts', 'eventId');
  }
}
