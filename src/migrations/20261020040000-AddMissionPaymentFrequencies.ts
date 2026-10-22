import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissionPaymentFrequencies20261020040000 implements MigrationInterface {
  name = 'AddMissionPaymentFrequencies20261020040000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "mission_frequencepaiement_enum" ADD VALUE IF NOT EXISTS 'hebdomadaire'`);
    await queryRunner.query(`ALTER TYPE "mission_frequencepaiement_enum" ADD VALUE IF NOT EXISTS 'annuel'`);
  }

  // PostgreSQL ne permet pas de retirer directement une valeur d’un enum.
  public async down(): Promise<void> {}
}
