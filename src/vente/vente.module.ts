import { Module } from '@nestjs/common';
import { VenteService } from './vente.service';
import { VenteController } from './vente.controller';

@Module({
  providers: [VenteService],
  controllers: [VenteController]
})
export class VenteModule {}
