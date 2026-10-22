import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Vente } from '../vente/vente.model';
import { Mission } from '../mission/mission.model';

export enum TransactionPurpose {
  ORDER = 'ORDER',
  MISSION_PUBLICATION = 'MISSION_PUBLICATION',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn()
  id!: number;

  // Référence Orion, transmise dans les métadonnées FedaPay et utilisée par les clients.
  @Column({ unique: true })
  reference!: string;

  @Column('float')
  amount!: number;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status!: TransactionStatus;

  @Column({ nullable: true })
  methode!: string;

  @Column({ nullable: true })
  description!: string;

  @Column({ type: 'text', default: TransactionPurpose.ORDER })
  purpose!: TransactionPurpose;

  @Column({ nullable: true })
  paymentToken!: string;

  // Identifiant généré par FedaPay, utilisé pour retrouver le paiement canonique.
  @Column({ nullable: true, unique: true })
  providerTransactionId!: string;

  // Le stock a été réservé à l'initialisation et ne doit être libéré qu'une fois.
  @Column({ default: false })
  stockReserved!: boolean;

  // Champs conservés pour les anciennes transactions CinetPay.
  @Column({ nullable: true })
  notifyToken!: string;

  @ManyToOne(() => Vente, { nullable: true })
  @JoinColumn({ name: 'venteId' })
  vente?: Vente;

  @Column({ nullable: true })
  venteId?: number;

  @ManyToOne(() => Mission, { nullable: true })
  @JoinColumn({ name: 'missionId' })
  mission?: Mission;

  @Column({ nullable: true })
  missionId?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
