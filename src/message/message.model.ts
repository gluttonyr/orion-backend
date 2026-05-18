import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, } from "typeorm";
import { Discussion } from "../discussion/discussion.model";
import { Utilisateur } from "../utilisateur/utilisateur.model";

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  FILE = "file",
}

export enum MessageStatus {
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
}

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Discussion, (discussion) => discussion.messages, { onDelete: "CASCADE", })
  @JoinColumn({ name: "discussionId" })
  discussion!: Discussion;

  @Column()
  discussionId!: number;

  @ManyToOne(() => Utilisateur, { onDelete: "CASCADE", })
  @JoinColumn({ name: "senderId" })
  sender!: Utilisateur;

  @Column()
  senderId!: number;

  @Column("text")
  contenu!: string;

  @Column({ type: "text", enum: MessageType, default: MessageType.TEXT, })
  type!: MessageType;

  @Column({ type: "text", enum: MessageStatus, default: MessageStatus.SENT, })
  statut!: MessageStatus;

  // image/fichier/video
  @Column({ nullable: true })
  mediaUrl!: string;

  @Column({ default: false })
  edited!: boolean;

  @Column({ default: false })
  deleted!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}