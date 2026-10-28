import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('aide_categorie')
export class AideCategorie {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 150 })
  titre!: string;

  @Column({ length: 500, default: '' })
  description!: string;

  @OneToMany(() => AideQuestion, (question) => question.categorie)
  questions!: AideQuestion[];
}

@Entity('aide_question')
export class AideQuestion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  categorieId!: number;

  @ManyToOne(() => AideCategorie, (categorie) => categorie.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categorieId' })
  categorie!: AideCategorie;

  @Column({ length: 255 })
  titre!: string;

  @Column({ type: 'text' })
  description!: string;
}
