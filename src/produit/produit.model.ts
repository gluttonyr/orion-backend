import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { Categorie } from "../categorie/categorie.model";

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

  @ManyToOne(() => Categorie)
  @JoinColumn({ name: 'categorieId' })
  categorie!: Categorie;

  @Column({ nullable: true })
  categorieId!: number;
}