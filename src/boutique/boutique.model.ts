import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { Produit } from "../produit/produit.model";

@Entity()
export class Boutique {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    nom!: string;

    // Champs additionnels pour aligner le backend avec le frontend
    @Column({ nullable: true })
    description?: string;

    @Column({ nullable: true })
    category?: string;

    @Column({ nullable: true })
    location?: string;

    @Column({ nullable: true })
    logo?: string;

    @Column({ type: 'boolean', default: true })
    active!: boolean;

    // ajout d'une limite de 30 produits par boutique
    @Column({ type: 'int', default: 0 })
    nombreProduits!: number;
    
    @ManyToMany(() => Produit)
    @JoinTable({name: "boutique_produit"})
    produits!: Produit[];

    @Column({ nullable: true })
    proprietaireId!: number;

    @Column()
    dateCreation!: Date;
}