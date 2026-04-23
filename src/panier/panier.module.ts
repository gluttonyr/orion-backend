import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Panier } from './panier.model';
import { PanierService } from './panier.service';
import { PanierController } from './panier.controller';
import { PanierRepository } from './panier.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Panier])],
  controllers: [PanierController],
  providers: [PanierService, PanierRepository],
})
export class PanierModule {}