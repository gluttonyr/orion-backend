import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Produit } from './produit.model';
import { ProduitService } from './produit.service';
import { ProduitController } from './produit.controller';
import { ProduitRepository } from './produit.repository';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [TypeOrmModule.forFeature([Produit]), UploadModule],
  controllers: [ProduitController],
  providers: [ProduitService, ProduitRepository],
})

export class ProduitModule {}