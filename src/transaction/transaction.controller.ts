import { Controller, Get, Param } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { Roles } from '../auth/roles.decorator';

@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.transactionService.findAll();
  }

  @Get(':reference')
  @Roles('ADMIN')
  findByReference(@Param('reference') reference: string) {
    return this.transactionService.findByReference(reference);
  }
}
