import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AideCategorie, AideQuestion } from './aide.model';
import { AideController } from './aide.controller';
import { AideService } from './aide.service';

@Module({
  imports: [TypeOrmModule.forFeature([AideCategorie, AideQuestion])],
  controllers: [AideController],
  providers: [AideService],
})
export class AideModule {}
