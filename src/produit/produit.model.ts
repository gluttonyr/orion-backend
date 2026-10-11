import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, RelationId } from "typeorm";
import { Categorie } from '../categorie/categorie.model';

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

  @ManyToOne(() => Categorie, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categorieId' })
  categorie!: Categorie | null;

  @RelationId((produit: Produit) => produit.categorie)
  categorieId?: number;

  @Column({ type: 'integer', nullable: true })
  proprietaireId!: number | null;
}
