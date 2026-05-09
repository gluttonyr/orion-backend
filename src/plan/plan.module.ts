import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from './plan.model';
import { PlanService } from './plan.service';
import { PlanController } from './plan.controller';
import { PlanRepository } from './plan.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Plan])],
  controllers: [PlanController],
  providers: [PlanService, PlanRepository],})

export class PanierModule {}