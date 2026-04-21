import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Produit {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  nom!: string;

  @Column()
  image!: string;

  @Column("text", { array: true, nullable: true })
  images_secondaires!: string[];



  @Column('float')
  prix!: number;

  @Column()
  description!: string;

  @Column()
  stock!: number;

  @Column()
  statut!: string;
}

