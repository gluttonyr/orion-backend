import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Vente {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  date_achat: string;

  @Column('float')
  prix_total: number;

  @Column()
  reference: string;
}