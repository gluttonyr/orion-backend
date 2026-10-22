import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from './utilisateur.model';
import { UtilisateurService } from './utilisateur.service';
import { UtilisateurRepository } from './utilisateur.repository';
import { UtilisateurController } from './utilisateur.controller';
import { UploadService } from './upload.service';

@Module({
   imports: [
      TypeOrmModule.forFeature([Utilisateur]),
   ],
   controllers: [UtilisateurController],
   providers:[
      UtilisateurService,
      UtilisateurRepository,
      UploadService],
   exports: [UtilisateurService],
})

export class UtilisateurModule {}
