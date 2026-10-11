import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vente } from './vente.model';
import { VenteService } from './vente.service';
import { VenteController } from './vente.controller';
import { VenteRepository } from './vente.repository';
import { PaiementModule } from '../paiement/paiement.module';
import { UtilisateurModule } from '../utilisateur/utilisateur.module';

@Module({
  imports: [TypeOrmModule.forFeature([Vente]), forwardRef(() => PaiementModule), UtilisateurModule],
  providers: [VenteService,VenteRepository],
  controllers: [VenteController],
  exports: [VenteService],
})
export class VenteModule {}
