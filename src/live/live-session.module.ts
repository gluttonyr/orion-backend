import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
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
    JwtModule.register({ secret: process.env.JWT_SECRET || 'orion_secret_key' }),
  ],
  controllers: [LiveSessionController],
  providers: [LiveSessionService],
  exports: [LiveSessionService],
})
export class LiveSessionModule {}
