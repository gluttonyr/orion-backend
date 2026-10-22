import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from './plan.model';
import { PlanService } from './plan.service';
import { PlanController } from './plan.controller';
import { PlanRepository } from './plan.repository';
import { Utilisateur } from '../utilisateur/utilisateur.model';
import { Boutique } from '../boutique/boutique.model';
import { Produit } from '../produit/produit.model';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, Utilisateur, Boutique, Produit]),
  ],
  controllers: [PlanController],
  providers: [PlanService, PlanRepository],
  exports: [PlanService],
})

export class PlanModule {}
