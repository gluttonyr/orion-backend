import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { Produit } from "../produit/produit.model";

@Entity()
export class Boutique {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    nom!: string;

    // ajout d'une limite de 30 produits par boutique
    @Column({ type: 'int', default: 0 })
    nombreProduits!: number;
    
    @ManyToMany(() => Produit)
    @JoinTable({name: "boutique_produit"})
    produits!: Produit[];

    @Column()
    proprietaireId!: number;

    @Column()
    dateCreation!: Date;
}