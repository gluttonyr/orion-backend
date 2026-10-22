import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Utilisateur } from '../utilisateur/utilisateur.model';
import { Short } from './short.model';

@Entity()
@Unique(['shortId', 'utilisateurId'])
export class ShortLike {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  shortId!: number;

  @Column()
  utilisateurId!: number;

  @CreateDateColumn()
  creeLe!: Date;

  @ManyToOne(() => Short, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shortId' })
  short!: Short;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateurId' })
  utilisateur!: Utilisateur;
}

@Entity()
export class ShortComment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  shortId!: number;

  @Column()
  utilisateurId!: number;

  @Column('text')
  contenu!: string;

  @CreateDateColumn()
  creeLe!: Date;

  @ManyToOne(() => Short, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shortId' })
  short!: Short;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateurId' })
  utilisateur!: Utilisateur;
}
