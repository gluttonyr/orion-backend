import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    
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
    BoutiqueModule],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule {}