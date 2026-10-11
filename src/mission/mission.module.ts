import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mission } from './mission.model';
import { MissionService } from './mission.service';
import { MissionController } from './mission.controller';
import { MissionRepository } from './mission.repository';
import { Utilisateur } from '../utilisateur/utilisateur.model';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [TypeOrmModule.forFeature([Mission, Utilisateur]), JwtModule.register({ secret: process.env.JWT_SECRET || 'orion_secret_key' })],
  controllers: [MissionController],
  providers: [MissionService, MissionRepository],
  exports: [MissionRepository, MissionService],
})

export class MissionModule {}
