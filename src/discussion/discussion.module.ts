import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discussion } from './discussion.model';
import { DiscussionService } from './discussion.service';
import { DiscussionController } from './discussion.controller';
import { DiscussionRepository } from './discussion.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Discussion])],
  controllers: [DiscussionController],
  providers: [DiscussionService, DiscussionRepository],
  exports: [DiscussionRepository],
})

export class DiscussionModule {}