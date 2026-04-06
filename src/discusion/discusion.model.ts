import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Discussion {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  date_debut: string;

  @Column()
  statue: string;
}