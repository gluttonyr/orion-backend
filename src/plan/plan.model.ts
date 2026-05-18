import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Utilisateur } from "../utilisateur/utilisateur.model";

export enum TypePlan {
    BASIQUE = 'BASIQUE',
    PREMIUM = 'PREMIUM',
    BUSINESS = 'BUSINESS',
    PRO = 'PRO',
}

@Entity()
export class Plan {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    titre!: string;

    @Column({ type: 'text', enum: TypePlan, default: TypePlan.BASIQUE, unique: true })
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

    @Column({default: 1})
    dureeEnMois!: number;

    @Column({default: () => "CURRENT_TIMESTAMP"})
    dateCreation!: Date;
    
    @Column()
    dateActivation!: Date;

    @Column()
    dateExpiration!: Date;

    @OneToOne(() => Utilisateur)
    @JoinColumn({ name: 'utilisateurId' })
    commercant!: Utilisateur;

    @Column({default: false})
    active!: boolean

    @Column({default: false})
    renouvelement!: boolean
}