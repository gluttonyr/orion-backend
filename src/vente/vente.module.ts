import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vente } from './vente.model';
import { VenteService } from './vente.service';
import { VenteController } from './vente.controller';
import { VenteRepository } from './vente.repository';
import { PaiementModule } from '../paiement/paiement.module';
import { UtilisateurModule } from '../utilisateur/utilisateur.module';
import { VenteRemise } from './vente-remise.model';
import { NotificationModule } from '../notification/notification.module';
import { PlateformeModule } from '../plateforme/plateforme.module';

@Module({
  imports: [TypeOrmModule.forFeature([Vente, VenteRemise]), forwardRef(() => PaiementModule), UtilisateurModule, NotificationModule, PlateformeModule],
  providers: [VenteService,VenteRepository],
  controllers: [VenteController],
  exports: [VenteService],
})
export class VenteModule {}
