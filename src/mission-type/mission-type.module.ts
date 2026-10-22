import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionType } from './mission-type.model';
import { MissionTypeController } from './mission-type.controller';
import { MissionTypeService } from './mission-type.service';

@Module({
  imports: [TypeOrmModule.forFeature([MissionType])],
  controllers: [MissionTypeController],
  providers: [MissionTypeService],
  exports: [MissionTypeService],
})
export class MissionTypeModule {}
