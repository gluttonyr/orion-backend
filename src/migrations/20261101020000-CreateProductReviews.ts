import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductReviews20261101020000 implements MigrationInterface {
  name = 'CreateProductReviews20261101020000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "produit_avis" (
        "id" SERIAL NOT NULL,
        "produitId" integer NOT NULL,
        "utilisateurId" integer NOT NULL,
        "note" smallint NOT NULL,
        "commentaire" text,
        "dateCreation" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_produit_avis_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_produit_avis_produit_utilisateur" UNIQUE ("produitId", "utilisateurId"),
        CONSTRAINT "FK_produit_avis_produit" FOREIGN KEY ("produitId") REFERENCES "produit"("id") ON DELETE CASCADE,
        CONSTRAINT "CK_produit_avis_note" CHECK ("note" >= 1 AND "note" <= 5)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "produit_avis"');
  }
}