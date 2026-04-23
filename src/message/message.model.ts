import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { Discussion } from "../discussion/discussion.model";
import { Utilisateur } from "../utilisateur/utilisateur.model";

@Entity()
export class Message {

  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Discussion)
  @JoinColumn({ name: 'discussionId' })
  discussion!: Discussion;

  @Column()
  discussionId!: number;

  @ManyToOne(() => Utilisateur)
  @JoinColumn({ name: 'utilisateurId' })
  utilisateur!: Utilisateur;

  @Column()
  utilisateurId!: number;

  @Column()
  contenu!: string;

  @Column()
  date_envoi!: Date;

  @Column({ default: 'text' })
  type_message!: string;

  @Column()
  statue!: string;
}