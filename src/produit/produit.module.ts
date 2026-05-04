import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Produit } from './produit.model';
import { ProduitService } from './produit.service';
import { ProduitController } from './produit.controller';
import { ProduitRepository } from './produit.repository';
import { UploadService } from 'src/upload/upload.service';

@Module({
  imports: [TypeOrmModule.forFeature([Produit])],
  controllers: [ProduitController],
  providers: [ProduitService, ProduitRepository, UploadService],
})
export class ProduitModule {}