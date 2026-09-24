import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
} from 'typeorm';

export class TrustReportsAndCoc1738000000003 implements MigrationInterface {
  name = 'TrustReportsAndCoc1738000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'applications',
      new TableColumn({
        name: 'codeOfConductAcceptedAt',
        type: 'datetime',
        isNullable: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'trust_reports',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'reporterSub', type: 'text', isNullable: false },
          { name: 'subjectType', type: 'text', isNullable: false },
          { name: 'subjectId', type: 'text', isNullable: false },
          { name: 'category', type: 'text', isNullable: false },
          { name: 'details', type: 'text', isNullable: false },
          {
            name: 'status',
            type: 'text',
            isNullable: false,
            default: "'open'",
          },
          { name: 'createdAt', type: 'datetime', isNullable: false },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('trust_reports', true);
    await queryRunner.dropColumn('applications', 'codeOfConductAcceptedAt');
  }
}
