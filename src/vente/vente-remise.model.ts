import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type VenteRemiseStatus = 'non_payee' | 'bloquee' | 'liberee' | 'remboursee';

@Entity()
@Index(['venteId', 'commercantId'], { unique: true })
export class VenteRemise {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  venteId!: number;

  @Column({ type: 'integer' })
  commercantId!: number;

  @Column({ type: 'integer' })
  montant!: number;

  @Column({ type: 'integer', default: 0 })
  montantBrut!: number;

  @Column({ type: 'integer', default: 0 })
  commissionMontant!: number;

  @Column({ type: 'float', default: 0 })
  commissionPourcentage!: number;

  @Column({ type: 'text' })
  articlesJson!: string;

  @Column({ type: 'text', default: 'non_payee' })
  statut!: VenteRemiseStatus;

  @Column({ type: 'text', nullable: true, unique: true })
  qrTokenHash!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  dateRemise!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
