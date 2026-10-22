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
import { NotificationModule } from './notification/notification.module';
import { PlateformeModule } from './plateforme/plateforme.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BoutiqueCategorieModule } from './boutique-categorie/boutique-categorie.module';

const bootstrapDatabase = process.env.DB_BOOTSTRAP === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'orion_db',
      entities: [__dirname + '/**/*.model{.ts,.js}'],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsRun: !bootstrapDatabase && !isDevelopment,
      autoLoadEntities: true,
      synchronize: bootstrapDatabase || (isDevelopment && process.env.DB_SYNCHRONIZE !== 'false'),
    }),
    AuthModule,
    UtilisateurModule,
    CategorieModule,
    BoutiqueCategorieModule,
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
    PlanModule,
    NotificationModule,
    PlateformeModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule {}
