import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './message.model';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { MessageRepository } from './message.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Message])],
  controllers: [MessageController],
  providers: [MessageService, MessageRepository],
  exports: [MessageRepository],
})
export class MessageModule {}
