import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, CreateDateColumn, } from "typeorm";
import { Discussion } from "../discussion/discussion.model";
import { Utilisateur } from "../utilisateur/utilisateur.model";

@Entity()
export class DiscussionParticipant {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Discussion, (discussion: any) => discussion.participants, { onDelete: "CASCADE", })
  @JoinColumn({ name: "discussionId" })
  discussion!: Discussion;

  @Column()
  discussionId!: number;

  @ManyToOne(() => Utilisateur, { onDelete: "CASCADE", })
  @JoinColumn({ name: "utilisateurId" })
  utilisateur!: Utilisateur;

  @Column()
  utilisateurId!: number;

  // dernier message lu
  @Column({ nullable: true })
  lastReadMessageId!: number;

  @Column({ default: false })
  muted!: boolean;

  @Column({ default: false })
  archived!: boolean;

  @CreateDateColumn()
  joinedAt!: Date;
}