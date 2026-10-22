import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable } from "typeorm";
import { Utilisateur } from "../utilisateur/utilisateur.model";
import { Produit } from "../produit/produit.model";

@Entity()
export class Vente {

  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Utilisateur, { nullable: true })
  @JoinColumn({ name: 'utilisateurId' })
  utilisateur!: Utilisateur | null;

  @Column({ type: 'integer', nullable: true })
  utilisateurId!: number | null;

  @Column({ type: 'text', nullable: true, select: false })
  clientPrenom!: string | null;

  @Column({ type: 'text', nullable: true, select: false })
  clientNom!: string | null;

  @Column({ type: 'text', nullable: true, select: false })
  clientEmail!: string | null;

  @Column({ type: 'text', nullable: true, select: false })
  clientTelephone!: string | null;

  @Column({ type: 'text', nullable: true, select: false })
  adresseLivraison!: string | null;

  @Column({ type: 'integer', nullable: true })
  liveSessionId!: number | null;

  @ManyToMany(() => Produit)
  @JoinTable({
    name: 'vente_produit',
    joinColumn: { name: 'venteId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'produitId', referencedColumnName: 'id' }
  })
  produits!: Produit[];

  @Column('simple-array')
  quantites!: number[];

  @Column('simple-array', { nullable: true })
  prix_unitaires!: number[] | null;

  // @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Column()
  date_achat!: Date;

  @Column('float')
  prix_total!: number;

  @Column()
  reference!: string;

  @Column({ default: 'en_cours' })
  statut!: string;
}
