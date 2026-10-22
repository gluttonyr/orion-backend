import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoutiqueCategorie } from './boutique-categorie.model';
import { BoutiqueCategorieController } from './boutique-categorie.controller';
import { BoutiqueCategorieService } from './boutique-categorie.service';

@Module({
  imports: [TypeOrmModule.forFeature([BoutiqueCategorie])],
  controllers: [BoutiqueCategorieController],
  providers: [BoutiqueCategorieService],
  exports: [BoutiqueCategorieService],
})
export class BoutiqueCategorieModule {}
