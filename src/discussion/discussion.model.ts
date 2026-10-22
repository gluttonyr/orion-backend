import { Column, Entity, OneToMany, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, } from "typeorm";
import { Message } from "../message/message.model";
import { DiscussionParticipant } from "../discussion-participant/discussion-participant.model";

export enum DiscussionType { PRIVATE = "private", GROUP = "group", }
export enum DiscussionStatus { ACTIVE = "active", ARCHIVED = "archived", BLOCKED = "blocked", }

@Entity()
export class Discussion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: DiscussionType, default: DiscussionType.PRIVATE })
  type!: DiscussionType;

  @Column({ type: 'enum', enum: DiscussionStatus, default: DiscussionStatus.ACTIVE })
  statut!: DiscussionStatus;

  @Column({ nullable: true })
  titre!: string;

  @Column({ nullable: true })
  photo!: string;

  // Dernier message rapide
  @Column({ nullable: true })
  lastMessage!: string;

  @Column({ nullable: true })
  lastMessageDate!: Date;

  @OneToMany(() => Message, (message) => message.discussion)
  messages!: Message[];

  @OneToMany(() => DiscussionParticipant, (participant: any) => participant.discussion)
  participants!: DiscussionParticipant[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
