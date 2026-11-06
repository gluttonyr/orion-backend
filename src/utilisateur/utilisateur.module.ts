import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from './utilisateur.model';
import { UtilisateurService } from './utilisateur.service';
import { UtilisateurRepository } from './utilisateur.repository';
import { UtilisateurController } from './utilisateur.controller';
import { UploadService } from './upload.service';
import { PasswordReset } from './password-reset.model';
import { PasswordResetService } from './password-reset.service';
import { MailService } from '../mail/mail.service';

@Module({
   imports: [
      TypeOrmModule.forFeature([Utilisateur, PasswordReset]),
   ],
   controllers: [UtilisateurController],
   providers:[
      UtilisateurService,
      UtilisateurRepository,
      UploadService,
      PasswordResetService,
      MailService],
   exports: [UtilisateurService, MailService],
})

export class UtilisateurModule {}
