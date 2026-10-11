import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Utilisateur } from '../utilisateur/utilisateur.model';
import { Produit } from '../produit/produit.model';

@Entity()
export class Short {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 120 })
  titre!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column()
  videoPath!: string;

  @Column({ type: 'text', nullable: true })
  coverPath!: string | null;

  @Column({ type: 'integer' })
  tailleOctets!: number;

  @Column({ type: 'integer', default: 0 })
  vues!: number;

  @Column({ type: 'integer', default: 0 })
  partages!: number;

  @Column({ type: 'boolean', default: true })
  publie!: boolean;

  @CreateDateColumn()
  creeLe!: Date;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auteurId' })
  auteur!: Utilisateur;

  @Column()
  auteurId!: number;

  @ManyToOne(() => Produit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'produitId' })
  produit!: Produit | null;

  @Column({ type: 'integer', nullable: true })
  produitId!: number | null;
}
