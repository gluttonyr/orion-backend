import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum UserRole {
  UTILISATEUR = 'UTILISATEUR',
  COMMERCANT = 'COMMERCANT',
  ENTREPRENEUR = 'ENTREPRENEUR',
}

@Entity()
export class Utilisateur {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  nom!: string;

  @Column()
  prenom!: string;

  @Column()
  email!: string;

  @Column()
  date_naissance!: string;

  @Column()
  adresse!: string;

  @Column({
    type: 'text',
    enum: UserRole,
    default: UserRole.UTILISATEUR,
  })
  role!: UserRole;

  @Column()
  password!: string;
}