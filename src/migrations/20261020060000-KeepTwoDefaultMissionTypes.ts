import { MigrationInterface, QueryRunner } from 'typeorm';

export class KeepTwoDefaultMissionTypes20261020060000 implements MigrationInterface {
  name = 'KeepTwoDefaultMissionTypes20261020060000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "mission_type" WHERE "nom" IN ('Service', 'Projet court', 'Formation', 'Emploi', 'Freelance', 'Livraison', 'Autre')`);
  }

  // Do not recreate removed options on rollback; an administrator may have intentionally deleted them.
  public async down(): Promise<void> {}
}
