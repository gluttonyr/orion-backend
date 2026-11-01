import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Produit } from './produit.model';

@Entity('produit_avis')
@Index(['produitId', 'utilisateurId'], { unique: true })
export class ProduitAvis {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  produitId!: number;

  @ManyToOne(() => Produit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'produitId' })
  produit!: Produit;

  @Column({ type: 'integer' })
  utilisateurId!: number;

  @Column({ type: 'smallint' })
  note!: number;

  @Column({ type: 'text', nullable: true })
  commentaire!: string | null;

  @CreateDateColumn()
  dateCreation!: Date;
}