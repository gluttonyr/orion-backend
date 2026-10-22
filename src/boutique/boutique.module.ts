import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Boutique } from './boutique.model';
import { BoutiqueController } from './boutique.controllers';
import { BoutiqueService } from './boutique.service';
import { BoutiqueRepository } from './boutique.repository';
import { UploadModule } from '../upload/upload.module';
import { PlanModule } from '../plan/plan.module';
import { BoutiqueCategorieModule } from '../boutique-categorie/boutique-categorie.module';

@Module({
  imports: [TypeOrmModule.forFeature([Boutique]), UploadModule, PlanModule, BoutiqueCategorieModule],
  controllers: [BoutiqueController],
  providers: [BoutiqueService, BoutiqueRepository],
  exports: [BoutiqueService],
})

export class BoutiqueModule {}
