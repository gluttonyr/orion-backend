import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Panier } from './panier.model';
import { PanierService } from './panier.service';
import { PanierController } from './panier.controller';
import { PanierRepository } from './panier.repository';
import { Produit } from '../produit/produit.model';

@Module({
  imports: [TypeOrmModule.forFeature([Panier, Produit])],
  controllers: [PanierController],
  providers: [PanierService, PanierRepository],
})
export class PanierModule {}
