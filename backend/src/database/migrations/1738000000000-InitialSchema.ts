import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class Initial1738000000000 implements MigrationInterface {
  name = 'Initial1738000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'email', type: 'text', isNullable: false },
          { name: 'passwordHash', type: 'text', isNullable: false },
          { name: 'name', type: 'text', isNullable: true },
          { name: 'roles', type: 'text', isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'users',
      new TableIndex({ name: 'IDX_users_email', columnNames: ['email'], isUnique: true }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'events',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'hostId', type: 'text', isNullable: false },
          { name: 'title', type: 'text', isNullable: false },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'date', type: 'text', isNullable: false },
          { name: 'capacity', type: 'integer', isNullable: false },
          { name: 'status', type: 'text', isNullable: false, default: "'draft'" },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'application_forms',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'eventId', type: 'text', isNullable: false },
          { name: 'schema', type: 'text', isNullable: false },
          { name: 'updatedAt', type: 'datetime', isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'application_forms',
      new TableIndex({
        name: 'IDX_application_forms_eventId',
        columnNames: ['eventId'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'applications',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'eventId', type: 'text', isNullable: false },
          { name: 'applicantSub', type: 'text', isNullable: false },
          { name: 'answers', type: 'text', isNullable: true },
          { name: 'status', type: 'text', isNullable: false, default: "'pending'" },
          { name: 'createdAt', type: 'datetime', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'invites',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'code', type: 'text', isNullable: false },
          { name: 'eventId', type: 'text', isNullable: false },
          { name: 'usedBy', type: 'text', isNullable: true },
          { name: 'usedAt', type: 'datetime', isNullable: true },
          { name: 'expiresAt', type: 'datetime', isNullable: true },
          { name: 'createdAt', type: 'datetime', isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'invites',
      new TableIndex({ name: 'IDX_invites_code', columnNames: ['code'], isUnique: true }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'checkin_tickets',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'token', type: 'text', isNullable: false },
          { name: 'eventId', type: 'text', isNullable: false },
          { name: 'userSub', type: 'text', isNullable: false },
          { name: 'issuedAt', type: 'datetime', isNullable: false },
          { name: 'usedAt', type: 'datetime', isNullable: true },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'checkin_tickets',
      new TableIndex({
        name: 'IDX_checkin_tickets_token',
        columnNames: ['token'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'stripe_accounts',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'hostId', type: 'text', isNullable: false },
          { name: 'accountId', type: 'text', isNullable: false },
          { name: 'createdAt', type: 'datetime', isNullable: false },
          { name: 'updatedAt', type: 'datetime', isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'stripe_accounts',
      new TableIndex({
        name: 'IDX_stripe_accounts_hostId',
        columnNames: ['hostId'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('stripe_accounts', true);
    await queryRunner.dropTable('checkin_tickets', true);
    await queryRunner.dropTable('invites', true);
    await queryRunner.dropTable('applications', true);
    await queryRunner.dropTable('application_forms', true);
    await queryRunner.dropTable('events', true);
    await queryRunner.dropTable('users', true);
  }
}
