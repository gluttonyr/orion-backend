import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserCountry20261020010000 implements MigrationInterface {
  name = 'AddUserCountry20261020010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('utilisateur'))) return;
    await queryRunner.query('ALTER TABLE "utilisateur" ALTER COLUMN "adresse" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "utilisateur" ADD COLUMN IF NOT EXISTS "pays" character varying');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('utilisateur'))) return;
    await queryRunner.query('UPDATE "utilisateur" SET "adresse" = \'\' WHERE "adresse" IS NULL');
    await queryRunner.query('ALTER TABLE "utilisateur" ALTER COLUMN "adresse" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "utilisateur" DROP COLUMN IF EXISTS "pays"');
  }
}
