import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UtilisateurModule } from './utilisateur/utilisateur.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UtilisateurRepository } from './utilisateur/utilisateur.repository';
import { Utilisateur } from './utilisateur/utilisateur.model';
import { CategorieModule } from './categorie/categorie.module';
import { Categorie } from './categorie/categorie.model';
import { VenteModule } from './vente/vente.module';
import { ProduitModule } from './produit/produit.module';
import { DemandeController } from './demande/demande.controller';
import { DemandeService } from './demande/demande.service';
import { DemandeModule } from './demande/demande.module';
import { MissionModule } from './mission/mission.module';
import { DiscussionModule } from './discussion/discussion.module';
import { MessageModule } from './message/message.module';
import { DemandeRepository } from './demande/demande.repository';
import { UploadModule } from './upload/upload.module';
import { PanierModule } from './panier/panier.module';

@Module({
  imports: [
    
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'orion_db.sqlite', // nom du fichier
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      autoLoadEntities: true,
      synchronize: true,}),
    TypeOrmModule.forFeature([Utilisateur,Categorie]),
    UtilisateurModule,
    CategorieModule,
    VenteModule,
    ProduitModule,
    DemandeModule,
    MissionModule,
    DiscussionModule,
    MessageModule,
    UploadModule,
    PanierModule],
  controllers: [AppController, DemandeController],
  providers: [AppService,UtilisateurRepository, DemandeService,DemandeRepository],
})

export class AppModule {}