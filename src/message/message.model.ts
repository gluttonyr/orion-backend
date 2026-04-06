import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Message {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  heure: string;

  @Column()
  contenue: string;

  @Column()
  date_debut: string;

  @Column()
  type_message: string;

  @Column()
  statue: string;
}