import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';
import { migrationDateTimeType } from '../migration-column-types';

export class AdminModeration1738000000005 implements MigrationInterface {
  name = 'AdminModeration1738000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dateTime = migrationDateTimeType(queryRunner);

    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'accountStatus',
        type: 'text',
        isNullable: false,
        default: "'active'",
      }),
      new TableColumn({
        name: 'suspendedAt',
        type: dateTime,
        isNullable: true,
      }),
      new TableColumn({
        name: 'suspensionReason',
        type: 'text',
        isNullable: true,
      }),
    ]);

    await queryRunner.addColumns('trust_reports', [
      new TableColumn({
        name: 'assignedToAdminId',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'adminNotes',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'resolvedAt',
        type: dateTime,
        isNullable: true,
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'admin_audit_log',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'actorSub', type: 'text', isNullable: false },
          { name: 'action', type: 'text', isNullable: false },
          { name: 'targetType', type: 'text', isNullable: false },
          { name: 'targetId', type: 'text', isNullable: false },
          { name: 'metadata', type: 'text', isNullable: true },
          { name: 'createdAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('admin_audit_log', true);
    await queryRunner.dropColumns('trust_reports', [
      'resolvedAt',
      'adminNotes',
      'assignedToAdminId',
    ]);
    await queryRunner.dropColumns('users', [
      'suspensionReason',
      'suspendedAt',
      'accountStatus',
    ]);
  }
}
