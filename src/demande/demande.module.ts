import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Demande } from './demande.model';
import { DemandeService } from './demande.service';
import { DemandeController } from './demande.controller';
import { DemandeRepository } from './demande.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Demande])],
  controllers: [DemandeController],
  providers: [DemandeService, DemandeRepository],
})
export class DemandeModule {}
