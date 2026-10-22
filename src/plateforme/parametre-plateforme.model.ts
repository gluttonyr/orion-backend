import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class ParametrePlateforme {
  @PrimaryColumn({ type: 'integer', default: 1 }) id!: number;
  @Column({ type: 'float', default: 5 }) commissionPourcentage!: number;
  @UpdateDateColumn() updatedAt!: Date;
}
