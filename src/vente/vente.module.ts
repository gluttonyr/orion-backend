import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vente } from './vente.model';
import { VenteService } from './vente.service';
import { VenteController } from './vente.controller';
import { VenteRepository } from './vente.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Vente])],
  providers: [VenteService,VenteRepository],
  controllers: [VenteController]
})
export class VenteModule {}