import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Boutique } from './boutique.model';
import { BoutiqueController } from './boutique.controllers';
import { BoutiqueService } from './boutique.service';
import { BoutiqueRepository } from './boutique.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Boutique])],
  controllers: [BoutiqueController],
  providers: [BoutiqueService, BoutiqueRepository],
  exports: [BoutiqueService],
})

export class BoutiqueModule {}