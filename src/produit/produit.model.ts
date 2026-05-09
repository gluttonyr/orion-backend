import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";

enum Categorie {
  ELECTRONIQUE = "ELECTRONIQUE",
  VETEMENTS = "VETEMENTS",
  MAISON = "MAISON"
}

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

  @Column({ type: 'text', enum: Categorie, default: Categorie.ELECTRONIQUE })
  categorie!: Categorie;

  @Column({ nullable: true })
  categorieId!: number;
}