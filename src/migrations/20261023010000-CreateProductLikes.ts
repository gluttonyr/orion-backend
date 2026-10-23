import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductLikes20261023010000 implements MigrationInterface {
  name = 'CreateProductLikes20261023010000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "produit_like" ("id" SERIAL NOT NULL, "produitId" integer NOT NULL, "visitorId" character varying(100) NOT NULL, CONSTRAINT "PK_produit_like_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_produit_like_visitor" UNIQUE ("produitId", "visitorId"), CONSTRAINT "FK_produit_like_produit" FOREIGN KEY ("produitId") REFERENCES "produit"("id") ON DELETE CASCADE)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "produit_like"`);
  }
}
