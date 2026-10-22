import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export enum UserRole {
  UTILISATEUR = 'UTILISATEUR',
  COMMERCANT = 'COMMERCANT',
  ADMIN = 'ADMIN',
}

@Entity()
@Index(['email'], { unique: true })
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

  @Column({ nullable: true })
  date_naissance!: string;

  @Column({ nullable: true })
  adresse!: string;
  
  @Column({ nullable: true })
  contact!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.UTILISATEUR })
  role!: UserRole;

  @Column()
  password!: string;

  // informations spécifiques pour les commerçants et entrepreneurs
  @Column({ nullable: true })
  specialite!: string;

  @Column({ nullable: true })
  localisation!: string;

  @Column({ nullable: true })
  pays!: string;

  @Column({ nullable: true })
  image!: string;

}
