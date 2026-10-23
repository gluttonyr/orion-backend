import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('produit_like')
@Index(['produitId', 'visitorId'], { unique: true })
export class ProduitLike {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  produitId!: number;

  @Column({ type: 'varchar', length: 100 })
  visitorId!: string;
}
