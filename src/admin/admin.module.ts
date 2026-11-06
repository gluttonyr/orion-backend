import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SiteSettings } from './site-settings.model';
import { Utilisateur } from '../utilisateur/utilisateur.model';
import { Vente } from '../vente/vente.model';
import { PortefeuillePlateforme } from '../plateforme/portefeuille-plateforme.model';
import { AdminGuard } from './admin.guard';
import { AboutTeamMember } from './about-team-member.model';
import { Produit } from '../produit/produit.model';
import { ProduitLike } from '../produit/produit-like.model';
import { VenteModule } from '../vente/vente.module';
import { OrderStatusService } from './order-status.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SiteSettings, Utilisateur, Vente, PortefeuillePlateforme, AboutTeamMember, Produit, ProduitLike]),
    VenteModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard, OrderStatusService],
})
export class AdminModule {}
