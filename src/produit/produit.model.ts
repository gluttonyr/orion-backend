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

  @Column('float', { nullable: true })
  prixPromotionnel!: number | null;

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

export function getProductSellingPrice(product: Pick<Produit, 'prix' | 'prixPromotionnel'>): number {
  const regularPrice = Number(product.prix);
  const promotionalPrice = Number(product.prixPromotionnel);
  return Number.isFinite(promotionalPrice) && promotionalPrice > 0 && promotionalPrice < regularPrice
    ? promotionalPrice
    : regularPrice;
}
