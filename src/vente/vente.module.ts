import { Module } from '@nestjs/common';
import { VenteService } from './vente.service';
import { VenteController } from './vente.controller';
import { VenteRepository } from './vente.repository';

@Module({
  providers: [VenteService,VenteRepository],
  controllers: [VenteController]
})
export class VenteModule {}
