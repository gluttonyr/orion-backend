import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { Utilisateur } from "../utilisateur/utilisateur.model";

export enum TypeMission {
  AUTRE = 'autre',
  EMPLOI = 'emploi',
  SERVICE = 'service',
  MISSION = 'mission',
  FORMATION = 'formation',
  FREELANCE = 'freelance',
  LIVRAISON = 'livraison',
}

export enum TypePaiement {
  FIXE = 'fixe',
  HORAIRE = 'horaire',
  JOURNALIER = 'journalier',
  MENSUEL = 'mensuel',
  PROJET = 'projet',
}

export enum StatutMission {
  OUVERTE = 'ouverte',
  EN_COURS = 'en_cours',
  TERMINEE = 'terminée',
  ANNULEE = 'annulée',
}

export enum StatutCandidature {
  EN_ATTENTE = 'en_attente',
  ACCEPTE = 'accepté',
  REFUSE = 'refusé',
}

@Entity()
export class Mission {

  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Utilisateur)
  @JoinColumn({ name: 'commercantId' })
  commercant!: Utilisateur;


  @Column()
  titre!: string;
  
  @Column()
  localisation!: string;

  @Column({ type: 'text', enum: TypeMission, default: TypeMission.AUTRE })
  type!: TypeMission;
  
  @Column({type: 'text', enum: StatutMission, default: StatutMission.OUVERTE })
  statut!: StatutMission;

  @Column()
  descriptionCourte!: string;

  @Column()
  description!: string;


  @Column({ type: 'decimal', precision: 10, scale: 2 })
  montant!: number;

  @Column({ type: 'text', enum: TypePaiement, default: TypePaiement.FIXE })
  frequencePaiement!: TypePaiement;

  // Durée de la mission en mois
  @Column()
  dureeMission!: number;

  // @Column({default: () => 'CURRENT_TIMESTAMP'})
  @Column()
  datePublication!: Date;

  @Column()
  dateLimiteCandidature!: Date;

  @Column()
  requis!: string;

  @Column({ type: "text", enum: StatutCandidature, default: StatutCandidature.EN_ATTENTE })
  candidatures?: Record<number, { user: number; statut: StatutCandidature }> | StatutCandidature.EN_ATTENTE;
}