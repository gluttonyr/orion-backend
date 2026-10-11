import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionRepository } from './transaction.repository';
import { Transaction, TransactionStatus } from './transaction.model';
import { CreateTransactionDto } from './transaction.dto';

@Injectable()
export class TransactionService {
  constructor(private readonly repo: TransactionRepository) {}

  create(dto: CreateTransactionDto): Promise<Transaction> {
    const transaction = this.repo.create(dto);
    return this.repo.save(transaction);
  }

  async attachProviderTransactionId(id: number, providerTransactionId: string) {
    await this.repo.update(id, { providerTransactionId });
    return this.repo.findOne({ where: { id }, relations: ['vente', 'vente.produits', 'mission'] });
  }

  findAll() {
    return this.repo.find({ relations: ['vente'] });
  }

  async findByReference(reference: string): Promise<Transaction> {
    const transaction = await this.repo.findByReference(reference);
    if (!transaction) {
      throw new NotFoundException(`Transaction ${reference} introuvable`);
    }
    return transaction;
  }

  async findByProviderTransactionId(providerTransactionId: string): Promise<Transaction> {
    const transaction = await this.repo.findByProviderTransactionId(providerTransactionId);
    if (!transaction) {
      throw new NotFoundException(`Transaction fournisseur ${providerTransactionId} introuvable`);
    }
    return transaction;
  }

  markSuccess(transaction: Transaction) {
    transaction.status = TransactionStatus.SUCCESS;
    return this.repo.save(transaction);
  }

  markFailed(transaction: Transaction) {
    transaction.status = TransactionStatus.FAILED;
    return this.repo.save(transaction);
  }
}
