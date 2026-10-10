import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
} from 'typeorm';
import {
  applyPostgresUuidIdDefaults,
  migrationDateTimeType,
} from '../migration-column-types';

const UUID_ID = { name: 'id', type: 'varchar', isPrimary: true } as const;

export class CommerceAndPaidCourses1738000000013 implements MigrationInterface {
  name = 'CommerceAndPaidCourses1738000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dateTime = migrationDateTimeType(queryRunner);

    await queryRunner.addColumn(
      'educational_contents',
      new TableColumn({
        name: 'priceCents',
        type: 'integer',
        isNullable: false,
        default: 0,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'commerce_orders',
        columns: [
          UUID_ID,
          { name: 'buyerId', type: 'text', isNullable: false },
          {
            name: 'status',
            type: 'text',
            isNullable: false,
            default: "'pending'",
          },
          { name: 'provider', type: 'text', isNullable: false },
          { name: 'providerRef', type: 'text', isNullable: false },
          {
            name: 'currency',
            type: 'text',
            isNullable: false,
            default: "'usd'",
          },
          { name: 'totalCents', type: 'integer', isNullable: false },
          { name: 'paidAt', type: dateTime, isNullable: true },
          { name: 'createdAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'commerce_orders',
      new TableIndex({
        name: 'IDX_commerce_orders_provider_ref',
        columnNames: ['providerRef'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'commerce_order_lines',
        columns: [
          UUID_ID,
          { name: 'orderId', type: 'text', isNullable: false },
          { name: 'productType', type: 'text', isNullable: false },
          { name: 'productId', type: 'text', isNullable: false },
          { name: 'amountCents', type: 'integer', isNullable: false },
          { name: 'payeeId', type: 'text', isNullable: true },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'commerce_order_lines',
      new TableIndex({
        name: 'IDX_commerce_order_lines_order',
        columnNames: ['orderId'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'commerce_entitlements',
        columns: [
          UUID_ID,
          { name: 'userId', type: 'text', isNullable: false },
          { name: 'productType', type: 'text', isNullable: false },
          { name: 'productId', type: 'text', isNullable: false },
          { name: 'orderLineId', type: 'text', isNullable: false },
          { name: 'revokedAt', type: dateTime, isNullable: true },
          { name: 'grantedAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'commerce_entitlements',
      new TableIndex({
        name: 'IDX_commerce_entitlements_user_product',
        columnNames: ['userId', 'productType', 'productId', 'revokedAt'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'commerce_refunds',
        columns: [
          UUID_ID,
          { name: 'orderId', type: 'text', isNullable: false },
          { name: 'orderLineId', type: 'text', isNullable: false },
          { name: 'amountCents', type: 'integer', isNullable: false },
          { name: 'reason', type: 'text', isNullable: true },
          { name: 'createdAt', type: dateTime, isNullable: false },
        ],
      }),
      true,
    );

    await applyPostgresUuidIdDefaults(queryRunner, [
      'commerce_orders',
      'commerce_order_lines',
      'commerce_entitlements',
      'commerce_refunds',
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('commerce_refunds', true);
    await queryRunner.dropTable('commerce_entitlements', true);
    await queryRunner.dropTable('commerce_order_lines', true);
    await queryRunner.dropTable('commerce_orders', true);
    await queryRunner.dropColumn('educational_contents', 'priceCents');
  }
}
