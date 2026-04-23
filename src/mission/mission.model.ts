import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { Utilisateur } from "../utilisateur/utilisateur.model";

@Entity()
export class Mission {

  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Utilisateur)
  @JoinColumn({ name: 'entrepreneurId' })
  entrepreneur!: Utilisateur;

  @Column()
  entrepreneurId!: number;

  @ManyToOne(() => Utilisateur)
  @JoinColumn({ name: 'commercantId' })
  commercant!: Utilisateur;

  @Column({ nullable: true })
  commercantId!: number;

  @Column()
  nom!: string;

  @Column()
  duree!: string;

  @Column('float')
  prix_total!: number;

  @Column()
  description!: string;

  @Column({ default: 'ouverte' })
  statut!: string;

  @Column()
  date_debut!: string;

  @Column()
  date_fin!: string;

  @Column()
  statue!: string;
}