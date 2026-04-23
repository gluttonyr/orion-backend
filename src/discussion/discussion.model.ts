import { Column, Entity, PrimaryGeneratedColumn, ManyToMany, JoinTable, OneToMany } from "typeorm";
import { Utilisateur } from "../utilisateur/utilisateur.model";
import { Message } from "../message/message.model";

@Entity()
export class Discussion {

  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToMany(() => Utilisateur)
  @JoinTable({
    name: 'discussion_utilisateur',
    joinColumn: { name: 'discussionId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'utilisateurId', referencedColumnName: 'id' }
  })
  participants!: Utilisateur[];

  @OneToMany(() => Message, message => message.discussion)
  messages!: Message[];

  @Column()
  date_debut!: Date;

  @Column({ default: 'active' })
  statut!: string;
}