import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Demande {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  statue!: string;

  @Column()
  date_envoi!: string;
}