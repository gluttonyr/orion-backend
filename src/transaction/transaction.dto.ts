import { TransactionPurpose } from './transaction.model';

export interface CreateTransactionDto {
  reference: string;
  amount: number;
  venteId?: number;
  missionId?: number;
  purpose?: TransactionPurpose;
  methode?: string;
  description?: string;
  paymentToken?: string;
  providerTransactionId?: string;
  notifyToken?: string;
  stockReserved?: boolean;
}
