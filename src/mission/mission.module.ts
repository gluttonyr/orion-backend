import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mission } from './mission.model';
import { MissionService } from './mission.service';
import { MissionController } from './mission.controller';
import { MissionRepository } from './mission.repository';
import { Utilisateur } from '../utilisateur/utilisateur.model';
import { MissionTypeModule } from '../mission-type/mission-type.module';
import { NotificationModule } from '../notification/notification.module';
import { DiscussionModule } from '../discussion/discussion.module';
import { DiscussionParticipantModule } from '../discussion-participant/discussion-participant.module';

@Module({
  imports: [TypeOrmModule.forFeature([Mission, Utilisateur]), MissionTypeModule, NotificationModule, DiscussionModule, DiscussionParticipantModule],
  controllers: [MissionController],
  providers: [MissionService, MissionRepository],
  exports: [MissionRepository, MissionService],
})

export class MissionModule {}
