import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('boutique_categorie')
@Index(['nom'], { unique: true })
export class BoutiqueCategorie {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  nom!: string;
}
