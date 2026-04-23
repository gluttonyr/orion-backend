import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum UserRole {
  UTILISATEUR = 'UTILISATEUR',
  COMMERCANT = 'COMMERCANT',
}

@Entity()
export class Utilisateur {

  @PrimaryGeneratedColumn()
  id!: number;

  // informations personnelles
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
  
  @Column({ nullable: true })
  contact!: string;

  @Column({
    type: 'text',
    enum: UserRole,
    default: UserRole.UTILISATEUR,
  })
  role!: UserRole;

  @Column()
  password!: string;

  // informations spécifiques pour les commerçants et entrepreneurs
  @Column({ nullable: true })
  specialite!: string;

  @Column({ nullable: true })
  localisation!: string;

}