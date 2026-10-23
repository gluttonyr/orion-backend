import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAboutTeamMember20261023000000 implements MigrationInterface {
  name = 'CreateAboutTeamMember20261023000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "about_team_member" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "role" character varying NOT NULL, "bio" text NOT NULL DEFAULT '', "photo" character varying, "position" integer NOT NULL DEFAULT 0, CONSTRAINT "PK_about_team_member_id" PRIMARY KEY ("id"))`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "about_team_member"`);
  }
}
