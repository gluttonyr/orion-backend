import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { MissionService } from './mission.service';
import { Mission } from './mission.model';

@Controller('mission')
export class MissionController {
  constructor(private readonly missionService: MissionService) {}

  // CREATE
  @Post()
  create(@Body() body: Partial<Mission>) {
    return this.missionService.create(body);
  }

  // GET ALL
  @Get()
  findAll() {
    return this.missionService.findAll();
  }

  // GET ONE
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.missionService.findOne(Number(id));
  }

  // UPDATE
  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<Mission>) {
    return this.missionService.update(Number(id), body);
  }

  // DELETE
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.missionService.remove(Number(id));
  }
}