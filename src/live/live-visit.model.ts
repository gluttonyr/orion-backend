import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { LiveSession } from './live-session.model';
import { Produit } from '../produit/produit.model';

@Entity()
export class LiveVisit {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => LiveSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'liveSessionId' })
  session!: LiveSession;

  @ManyToOne(() => Produit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'produitId' })
  produit!: Produit;

  @CreateDateColumn()
  visitedAt!: Date;
}
