import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBoutiqueSignalements20261101000000 implements MigrationInterface {
  name = 'CreateBoutiqueSignalements20261101000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "boutique_signalement" (
        "id" SERIAL NOT NULL,
        "boutiqueId" integer NOT NULL,
        "utilisateurId" integer,
        "motif" text NOT NULL,
        "resolu" boolean NOT NULL DEFAULT false,
        "dateCreation" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "commentaireAdmin" text,
        CONSTRAINT "PK_boutique_signalement_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_boutique_signalement_boutique" FOREIGN KEY ("boutiqueId") REFERENCES "boutique"("id") ON DELETE RESTRICT
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "boutique_signalement"');
  }
}