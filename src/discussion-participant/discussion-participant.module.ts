import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscussionParticipantService } from './discussion-participant.service';
import { DiscussionParticipantController } from './discussion-participant.controller';
import { DiscussionParticipantRepository } from './discussion-participant.repository';
import { DiscussionParticipant } from './discussion-participant.model';

@Module({
  imports: [TypeOrmModule.forFeature([DiscussionParticipant])],
  controllers: [DiscussionParticipantController],
  providers: [DiscussionParticipantService, DiscussionParticipantRepository],
  exports: [DiscussionParticipantRepository],
})

export class DiscussionModule {}