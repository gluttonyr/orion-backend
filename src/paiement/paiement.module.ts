import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CinetpayService } from './cinetpay.service';
import { PaiementController } from './paiement.controller';
import { VenteModule } from '../vente/vente.module';
import { ProduitModule } from '../produit/produit.module';
import { TransactionModule } from '../transaction/transaction.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vente } from '../vente/vente.model';
import { VenteRemise } from '../vente/vente-remise.model';
import { FedaPayService } from './fedapay.service';
import { LiveSessionModule } from '../live/live-session.module';
import { UtilisateurModule } from '../utilisateur/utilisateur.module';
import { MissionModule } from '../mission/mission.module';
import { NotificationModule } from '../notification/notification.module';
import { PlateformeModule } from '../plateforme/plateforme.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Vente, VenteRemise]),
    forwardRef(() => VenteModule),
    ProduitModule,
    TransactionModule,
    LiveSessionModule,
    UtilisateurModule,
    MissionModule,
    NotificationModule,
    PlateformeModule,
  ],
  controllers: [PaiementController],
  providers: [CinetpayService, FedaPayService],
  exports: [CinetpayService],
})
export class PaiementModule {}
