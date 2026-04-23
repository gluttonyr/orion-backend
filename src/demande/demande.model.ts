import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { Utilisateur } from "../utilisateur/utilisateur.model";

@Entity()
export class Demande {

  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Utilisateur)
  @JoinColumn({ name: 'utilisateurId' })
  utilisateur!: Utilisateur;

  @Column()
  utilisateurId!: number;

  @Column()
  type!: string;

  @Column()
  description!: string;

  @Column({ default: 'en_attente' })
  statut!: string;

  @Column()
  date_envoi!: Date;
}