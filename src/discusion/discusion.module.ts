import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discussion } from './discusion.model';
import { DiscussionService } from './discusion.service';
import { DiscussionController } from './discusion.controller';
import { DiscussionRepository } from './discusion.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Discussion])],
  controllers: [DiscussionController],
  providers: [DiscussionService, DiscussionRepository],
  exports: [DiscussionRepository],
})
export class DiscussionModule {}
