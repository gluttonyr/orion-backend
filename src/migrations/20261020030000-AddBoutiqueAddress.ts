import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBoutiqueAddress20261020030000 implements MigrationInterface {
  name = 'AddBoutiqueAddress20261020030000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "boutique" ADD COLUMN IF NOT EXISTS "address" character varying');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "boutique" DROP COLUMN IF EXISTS "address"');
  }
}
