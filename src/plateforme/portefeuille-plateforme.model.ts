import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class PortefeuillePlateforme {
  @PrimaryColumn({ type: 'integer', default: 1 }) id!: number;
  @Column({ type: 'integer', default: 0 }) solde!: number;
  @Column({ type: 'integer', default: 0 }) totalCommissions!: number;
  @Column({ type: 'integer', default: 0 }) totalRemboursements!: number;
  @UpdateDateColumn() updatedAt!: Date;
}
