import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable } from "typeorm";

@Entity()
export class Plan {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    nom!: string;

    @Column('decimal', { precision: 10, scale: 2 })
    prix!: number;
    
    @Column()
    avantages!: string[];

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
}