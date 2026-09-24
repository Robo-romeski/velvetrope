import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPasswordResetToUsers1738000000001 implements MigrationInterface {
  name = 'AddPasswordResetToUsers1738000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'passwordResetTokenHash',
        type: 'text',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'passwordResetExpiresAt',
        type: 'datetime',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'passwordResetExpiresAt');
    await queryRunner.dropColumn('users', 'passwordResetTokenHash');
  }
}
