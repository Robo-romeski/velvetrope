import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
import { migrationDateTimeType } from '../migration-column-types';

export class PilotSignupAndEventLocation1738000000026
  implements MigrationInterface
{
  name = 'PilotSignupAndEventLocation1738000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dateTime = migrationDateTimeType(queryRunner);

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'ageConfirmedAt',
        type: dateTime,
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'termsAcceptedVersion',
        type: 'text',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'termsAcceptedAt',
        type: dateTime,
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'events',
      new TableColumn({
        name: 'locationPublicLabel',
        type: 'text',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'events',
      new TableColumn({
        name: 'locationExactAddress',
        type: 'text',
        isNullable: true,
      }),
    );

    await queryRunner.manager
      .createQueryBuilder()
      .update('events')
      .set({
        status: 'cancelled',
        isDiscoveryVisible: false,
        ticketPriceCents: 0,
      })
      .where(
        [
          "title LIKE 'Prod Smoke Gathering%'",
          "title LIKE 'Prod smoke %'",
          "description = 'tier2-prod-smoke.sh'",
        ].join(' OR '),
      )
      .execute();

    await queryRunner.manager
      .createQueryBuilder()
      .update('educational_contents')
      .set({ status: 'draft' })
      .where(
        [
          "title LIKE 'Prod Review Guide %'",
          "slug LIKE 'prod-review-guide-%'",
        ].join(' OR '),
      )
      .execute();
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('events', 'locationExactAddress');
    await queryRunner.dropColumn('events', 'locationPublicLabel');
    await queryRunner.dropColumn('users', 'termsAcceptedAt');
    await queryRunner.dropColumn('users', 'termsAcceptedVersion');
    await queryRunner.dropColumn('users', 'ageConfirmedAt');
  }
}
