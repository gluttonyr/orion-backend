import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Boutique } from '../boutique/boutique.model';
import { Produit } from '../produit/produit.model';

@Entity()
export class LiveSession {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  ownerId!: number;

  @ManyToOne(() => Boutique, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'boutiqueId' })
  boutique!: Boutique;

  @Column()
  boutiqueId!: number;

  @ManyToMany(() => Produit)
  @JoinTable({
    name: 'live_session_produit',
    joinColumn: { name: 'liveSessionId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'produitId', referencedColumnName: 'id' },
  })
  produits!: Produit[];

  @Column({ type: 'text' })
  tiktokUrl!: string;

  @Column({ type: 'datetime' })
  startedAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  endedAt!: Date | null;
}
