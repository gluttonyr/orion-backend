import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Boutique } from './boutique.model';
import { Produit } from '../produit/produit.model';

@Entity()
export class BoutiqueSignalement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  boutiqueId!: number;

  @ManyToOne(() => Boutique, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'boutiqueId' })
  boutique!: Boutique;

  @Column({ type: 'int', nullable: true })
  produitId!: number | null;

  @ManyToOne(() => Produit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'produitId' })
  produit?: Produit | null;

  @Column({ type: 'int', nullable: true })
  utilisateurId!: number | null;

  @Column({ type: 'text' })
  motif!: string;

  @Column({ type: 'boolean', default: false })
  resolu!: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateCreation!: Date;

  @Column({ type: 'text', nullable: true })
  commentaireAdmin?: string | null;
}