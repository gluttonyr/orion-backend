import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mission } from './mission.model';
import { MissionService } from './mission.service';
import { MissionController } from './mission.controller';
import { MissionRepository } from './mission.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Mission])],
  controllers: [MissionController],
  providers: [MissionService, MissionRepository],
  exports: [MissionRepository],
})
export class MissionModule {}
