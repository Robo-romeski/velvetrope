import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';
import { ApplicationEntity } from '../../applications/application.entity';
import { migrationDateTimeType } from '../migration-column-types';

export class WaitlistAndApplicationDecisions1738000000004
  implements MigrationInterface
{
  name = 'WaitlistAndApplicationDecisions1738000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dateTime = migrationDateTimeType(queryRunner);

    await queryRunner.addColumns('applications', [
      new TableColumn({
        name: 'decisionReason',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'decidedAt',
        type: dateTime,
        isNullable: true,
      }),
      new TableColumn({
        name: 'decidedByHostId',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'waitlistedAt',
        type: dateTime,
        isNullable: true,
      }),
      new TableColumn({
        name: 'waitlistRank',
        type: 'integer',
        isNullable: true,
      }),
      new TableColumn({
        name: 'promotedAt',
        type: dateTime,
        isNullable: true,
      }),
    ]);

    const rows = await queryRunner.query(
      `SELECT "id", "eventId", "applicantSub", "createdAt"
       FROM "applications"
       ORDER BY "createdAt" ASC, "id" ASC`,
    );
    const seen = new Set<string>();
    for (const row of rows as Array<{
      id: string;
      eventId: string;
      applicantSub: string;
    }>) {
      const key = `${row.eventId}\u0000${row.applicantSub}`;
      if (seen.has(key)) {
        await queryRunner.manager.delete(ApplicationEntity, { id: row.id });
      } else {
        seen.add(key);
      }
    }

    await queryRunner.createIndex(
      'applications',
      new TableIndex({
        name: 'IDX_applications_event_applicant',
        columnNames: ['eventId', 'applicantSub'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'applications',
      'IDX_applications_event_applicant',
    );
    await queryRunner.dropColumns('applications', [
      'promotedAt',
      'waitlistRank',
      'waitlistedAt',
      'decidedByHostId',
      'decidedAt',
      'decisionReason',
    ]);
  }
}
