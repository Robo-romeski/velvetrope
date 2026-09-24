import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddTicketPriceAndEventPayments1738000000002
  implements MigrationInterface
{
  name = 'AddTicketPriceAndEventPayments1738000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'events',
      new TableColumn({
        name: 'ticketPriceCents',
        type: 'integer',
        isNullable: false,
        default: 0,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'event_payments',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'eventId', type: 'text', isNullable: false },
          { name: 'userSub', type: 'text', isNullable: false },
          { name: 'amountCents', type: 'integer', isNullable: false },
          {
            name: 'status',
            type: 'text',
            isNullable: false,
            default: "'pending'",
          },
          { name: 'stripeCheckoutSessionId', type: 'text', isNullable: true },
          { name: 'stripePaymentIntentId', type: 'text', isNullable: true },
          { name: 'paidAt', type: 'datetime', isNullable: true },
          { name: 'createdAt', type: 'datetime', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'event_payments',
      new TableIndex({
        name: 'IDX_event_payments_event_user',
        columnNames: ['eventId', 'userSub'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('event_payments', true);
    await queryRunner.dropColumn('events', 'ticketPriceCents');
  }
}
