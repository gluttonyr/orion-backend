import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Demande de réinitialisation de mot de passe.
 * Le code (6 chiffres) et le jeton de réinitialisation ne sont jamais stockés en clair : seulement leur empreinte SHA-256.
 */
@Entity('password_reset')
export class PasswordReset {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  utilisateurId!: number;

  @Column({ length: 64 })
  codeHash!: string;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'smallint', default: 0 })
  attempts!: number;

  /** Empreinte du jeton remis après vérification du code ; null tant que le code n'est pas validé. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  resetTokenHash!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpiresAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
