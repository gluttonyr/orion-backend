import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UtilisateurModule } from './utilisateur/utilisateur.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategorieModule } from './categorie/categorie.module';
import { VenteModule } from './vente/vente.module';
import { ProduitModule } from './produit/produit.module';
import { DemandeModule } from './demande/demande.module';
import { MissionModule } from './mission/mission.module';
import { DiscussionModule } from './discussion/discussion.module';
import { MessageModule } from './message/message.module';
import { UploadModule } from './upload/upload.module';
import { PanierModule } from './panier/panier.module';
import { BoutiqueModule } from './boutique/boutique.module';
import { TransactionModule } from './transaction/transaction.module';
import { PaiementModule } from './paiement/paiement.module';
import { ShortModule } from './short/short.module';
import { LiveSessionModule } from './live/live-session.module';
import { PlanModule } from './plan/plan.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'orion_db.sqlite', // nom du fichier
      entities: [__dirname + '/**/*.model{.ts,.js}'],
      autoLoadEntities: true,
      synchronize: true,}),
    UtilisateurModule,
    CategorieModule,
    VenteModule,
    ProduitModule,
    DemandeModule,
    MissionModule,
    DiscussionModule,
    MessageModule,
    UploadModule,
    PanierModule,
    BoutiqueModule,
    TransactionModule,
    PaiementModule,
    ShortModule,
    LiveSessionModule,
    PlanModule],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule {}
