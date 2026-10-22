import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowNullableBirthDate20261020000000 implements MigrationInterface {
  name = 'AllowNullableBirthDate20261020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('utilisateur')) {
      await queryRunner.query('ALTER TABLE "utilisateur" ALTER COLUMN "date_naissance" DROP NOT NULL');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('utilisateur')) {
      await queryRunner.query('UPDATE "utilisateur" SET "date_naissance" = \'2000-01-01\' WHERE "date_naissance" IS NULL');
      await queryRunner.query('ALTER TABLE "utilisateur" ALTER COLUMN "date_naissance" SET NOT NULL');
    }
  }
}
