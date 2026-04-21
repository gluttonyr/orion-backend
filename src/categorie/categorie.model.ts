import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class Categorie {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  libellé!: string;

  @Column()
  dexcription!: string;

}