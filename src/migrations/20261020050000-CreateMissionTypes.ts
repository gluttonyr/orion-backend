import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMissionTypes20261020050000 implements MigrationInterface {
  name = 'CreateMissionTypes20261020050000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "mission_type" ("id" SERIAL NOT NULL, "nom" character varying(100) NOT NULL, CONSTRAINT "UQ_mission_type_nom" UNIQUE ("nom"), CONSTRAINT "PK_mission_type_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`INSERT INTO "mission_type" ("nom") VALUES ('Mission rémunérée'), ('Collaboration') ON CONFLICT ("nom") DO NOTHING`);
    await queryRunner.query(`ALTER TABLE "mission" ALTER COLUMN "type" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "mission" ALTER COLUMN "type" TYPE character varying(100) USING (CASE lower("type"::text) WHEN 'mission' THEN 'Mission rémunérée' WHEN 'autre' THEN 'Autre' WHEN 'emploi' THEN 'Emploi' WHEN 'service' THEN 'Service' WHEN 'formation' THEN 'Formation' WHEN 'freelance' THEN 'Freelance' WHEN 'livraison' THEN 'Livraison' ELSE "type"::text END)`);
    await queryRunner.query(`ALTER TABLE "mission" ALTER COLUMN "type" SET DEFAULT 'Mission rémunérée'`);
    await queryRunner.query(`DROP TYPE IF EXISTS "mission_type_enum"`);
  }

  // The dynamic mission labels cannot be converted safely back to the old fixed enum.
  public async down(): Promise<void> {}
}
