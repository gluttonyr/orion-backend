import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Mission {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nom: string;

  @Column()
  duree: string;

  @Column('float')
  prix_total: number;

  @Column()
  description: string;

  @Column()
  date_debut: string;

  @Column()
  date_fin: string;

  @Column()
  statue: string;
}