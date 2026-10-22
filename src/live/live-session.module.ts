import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Boutique } from '../boutique/boutique.model';
import { Produit } from '../produit/produit.model';
import { Utilisateur } from '../utilisateur/utilisateur.model';
import { Vente } from '../vente/vente.model';
import { LiveSession } from './live-session.model';
import { LiveVisit } from './live-visit.model';
import { LiveSessionController } from './live-session.controller';
import { LiveSessionService } from './live-session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LiveSession, LiveVisit, Boutique, Produit, Utilisateur, Vente]),
  ],
  controllers: [LiveSessionController],
  providers: [LiveSessionService],
  exports: [LiveSessionService],
})
export class LiveSessionModule {}
