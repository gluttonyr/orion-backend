import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductToBoutiqueSignalements20261101010000 implements MigrationInterface {
  name = 'AddProductToBoutiqueSignalements20261101010000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "boutique_signalement" ADD COLUMN IF NOT EXISTS "produitId" integer');
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_boutique_signalement_produit') THEN
          ALTER TABLE "boutique_signalement"
          ADD CONSTRAINT "FK_boutique_signalement_produit"
          FOREIGN KEY ("produitId") REFERENCES "produit"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "boutique_signalement" DROP CONSTRAINT IF EXISTS "FK_boutique_signalement_produit"');
    await queryRunner.query('ALTER TABLE "boutique_signalement" DROP COLUMN IF EXISTS "produitId"');
  }
}