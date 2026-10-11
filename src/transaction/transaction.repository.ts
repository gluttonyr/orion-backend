import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Transaction } from './transaction.model';

@Injectable()
export class TransactionRepository extends Repository<Transaction> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(Transaction, dataSource.createEntityManager());
  }

  findByReference(reference: string) {
    return this.findOne({
      where: { reference },
      relations: ['vente', 'vente.produits', 'mission'],
    });
  }

  findByProviderTransactionId(providerTransactionId: string) {
    return this.findOne({
      where: { providerTransactionId },
      relations: ['vente', 'vente.produits', 'mission'],
    });
  }
}
