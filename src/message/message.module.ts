import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './message.model';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { MessageRepository } from './message.repository';
import { DiscussionModule } from '../discussion/discussion.module';
import { DiscussionParticipantModule } from '../discussion-participant/discussion-participant.module';

@Module({
  imports: [TypeOrmModule.forFeature([Message]), DiscussionModule, DiscussionParticipantModule],
  controllers: [MessageController],
  providers: [MessageService, MessageRepository],
  exports: [MessageRepository],
})
export class MessageModule {}
