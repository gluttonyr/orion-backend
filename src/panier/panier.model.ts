import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable } from "typeorm";
import { Utilisateur } from "../utilisateur/utilisateur.model";
import { Produit } from "../produit/produit.model";

@Entity()
export class Panier {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Utilisateur)
    @JoinColumn({ name: 'utilisateurId' })
    utilisateur!: Utilisateur;

    @Column()
    utilisateurId!: number;

    @ManyToMany(() => Produit)
    @JoinTable({
        name: 'panier_produit',
        joinColumn: { name: 'panierId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'produitId', referencedColumnName: 'id' }
    })
    produits!: Produit[];

    @Column('simple-array')
    quantites!: number[];

    @Column()
    dateCommande!: Date;

    @Column({ default: 'en_cours' })
    statut!: string;
}