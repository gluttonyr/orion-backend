import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasswordReset20261106000000 implements MigrationInterface {
  name = 'CreatePasswordReset20261106000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "password_reset" (
        "id" SERIAL NOT NULL,
        "utilisateurId" integer NOT NULL,
        "codeHash" character varying(64) NOT NULL,
        "expiresAt" timestamp NOT NULL,
        "attempts" smallint NOT NULL DEFAULT 0,
        "resetTokenHash" character varying(64),
        "resetTokenExpiresAt" timestamp,
        "usedAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_reset_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_password_reset_utilisateur" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateur"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_password_reset_utilisateur" ON "password_reset" ("utilisateurId")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "password_reset"');
  }
}
