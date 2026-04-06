import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from './utilisateur.model';
import { UtilisateurService } from './utilisateur.service';
import { UtilisateurRepository } from './utilisateur.repository';
import { UtilisateurController } from './utilisateur.controller';

@Module({

controllers: [UtilisateurController],
providers:[
   UtilisateurService,
   UtilisateurRepository
   
]
  
})
export class UtilisateurModule {}
