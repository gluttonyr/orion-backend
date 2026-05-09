import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from './utilisateur.model';
import { UtilisateurService } from './utilisateur.service';
import { UtilisateurRepository } from './utilisateur.repository';
import { UtilisateurController } from './utilisateur.controller';
import { UploadService } from './upload.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
   imports: [
      TypeOrmModule.forFeature([Utilisateur]),
      JwtModule.register({
         secret: process.env.JWT_SECRET || "orion_secret_key",
         signOptions: { expiresIn: "2d",},
      }),
   ],
   controllers: [UtilisateurController],
   providers:[
      UtilisateurService,
      UtilisateurRepository,
      UploadService],
   exports: [UtilisateurService],
})

export class UtilisateurModule {}