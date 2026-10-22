import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParametrePlateforme } from './parametre-plateforme.model';
import { PortefeuillePlateforme } from './portefeuille-plateforme.model';
import { PlateformeFinanceService } from './plateforme-finance.service';

@Module({
  imports: [TypeOrmModule.forFeature([ParametrePlateforme, PortefeuillePlateforme])],
  providers: [PlateformeFinanceService],
  exports: [PlateformeFinanceService],
})
export class PlateformeModule {}
