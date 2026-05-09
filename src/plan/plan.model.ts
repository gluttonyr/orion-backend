import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Utilisateur } from "../utilisateur/utilisateur.model";

export enum TypePlan {
    GRATUIT = 'GRATUIT',
    PREMIUM = 'PREMIUM',
    PRO = 'PRO',
}

@Entity()
export class Plan {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    titre!: string;

    @Column({ type: 'text', enum: TypePlan, default: TypePlan.GRATUIT })
    type!: TypePlan;

    @Column('decimal', { precision: 10, scale: 2 })
    prix!: number;
    
    @Column()
    avantages!: string;

    @Column()
    description!: string;

    @Column({ type: 'int', default: 1 })
    nombreBoutiques!: number;

    @Column()
    nombreProduits!: number;

    @Column()
    dureeEnMois!: number;

    @Column()
    dateCreation!: Date;

    @Column()
    dateExpiration!: Date;

    @ManyToOne(() => Utilisateur)
    @JoinColumn({ name: 'utilisateurId' })
    commercant!: Utilisateur;
}