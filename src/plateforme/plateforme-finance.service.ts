import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ParametrePlateforme } from './parametre-plateforme.model';
import { PortefeuillePlateforme } from './portefeuille-plateforme.model';

@Injectable()
export class PlateformeFinanceService implements OnModuleInit {
  constructor(
    @InjectRepository(ParametrePlateforme) private readonly parameters: Repository<ParametrePlateforme>,
    @InjectRepository(PortefeuillePlateforme) private readonly wallets: Repository<PortefeuillePlateforme>,
  ) {}

  async onModuleInit() {
    if (!await this.parameters.findOne({ where: { id: 1 } })) await this.parameters.save({ id: 1, commissionPourcentage: 5 });
    if (!await this.wallets.findOne({ where: { id: 1 } })) await this.wallets.save({ id: 1, solde: 0, totalCommissions: 0, totalRemboursements: 0 });
  }

  async getCommissionRate(manager?: EntityManager) {
    const repo = manager?.getRepository(ParametrePlateforme) ?? this.parameters;
    const rate = (await repo.findOne({ where: { id: 1 } }))?.commissionPourcentage ?? 5;
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error('Le taux de commission plateforme doit être compris entre 0 et 100.');
    return rate;
  }

  async creditCommission(manager: EntityManager, amount: number) {
    if (amount <= 0) return;
    await manager.increment(PortefeuillePlateforme, { id: 1 }, 'solde', amount);
    await manager.increment(PortefeuillePlateforme, { id: 1 }, 'totalCommissions', amount);
  }

  async reverseCommission(manager: EntityManager, amount: number) {
    if (amount <= 0) return;
    await manager.decrement(PortefeuillePlateforme, { id: 1 }, 'solde', amount);
    await manager.increment(PortefeuillePlateforme, { id: 1 }, 'totalRemboursements', amount);
  }
}
