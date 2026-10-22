import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBoutiqueCategories20261020020000 implements MigrationInterface {
  name = 'CreateBoutiqueCategories20261020020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "boutique_categorie" (
        "id" SERIAL NOT NULL,
        "nom" character varying(100) NOT NULL,
        CONSTRAINT "PK_boutique_categorie" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_boutique_categorie_nom" UNIQUE ("nom")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "boutique_categorie" ("nom")
      VALUES ('Mode & accessoires'), ('Maison & décoration')
      ON CONFLICT ("nom") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "boutique_categorie"');
  }
}
