import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Produit } from './produit.model';
import { ProduitLike } from './produit-like.model';
import { ProduitService } from './produit.service';
import { ProduitController } from './produit.controller';
import { ProduitRepository } from './produit.repository';
import { UploadModule } from '../upload/upload.module';
import { PlanModule } from '../plan/plan.module';

@Module({
  imports: [TypeOrmModule.forFeature([Produit, ProduitLike]), UploadModule, PlanModule],
  controllers: [ProduitController],
  providers: [ProduitService, ProduitRepository],
  exports: [ProduitService],
})

export class ProduitModule {}
