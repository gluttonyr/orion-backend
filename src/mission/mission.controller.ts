import { Body, Controller, Delete, Get, Headers, Param, Post, Put } from '@nestjs/common';
import { MissionService } from './mission.service';
import { Mission } from './mission.model';

@Controller('mission')
export class MissionController {
  constructor(private readonly missionService: MissionService) {}

  // CREATE
  @Post()
  create(@Body() body: Mission, @Headers('authorization') authorization: string) {
    return this.missionService.create(body, authorization?.replace(/^Bearer\s+/i, ''));
  }

  @Get('mine')
  findMine(@Headers('authorization') authorization: string) {
    return this.missionService.findMine(authorization?.replace(/^Bearer\s+/i, ''));
  }


  @Post(':id/candidatures')
  apply(@Param('id') id: string, @Body() body: { message?: string }, @Headers('authorization') authorization: string) {
    return this.missionService.apply(Number(id), body.message ?? '', authorization?.replace(/^Bearer\s+/i, ''));
  }

  @Get(':id/candidatures/me')
  getMyApplication(@Param('id') id: string, @Headers('authorization') authorization: string) {
    return this.missionService.getMyApplication(Number(id), authorization?.replace(/^Bearer\s+/i, ''));
  }

  @Get(':id/candidatures')
  getCandidates(@Param('id') id: string, @Headers('authorization') authorization: string) {
    return this.missionService.getCandidates(Number(id), authorization?.replace(/^Bearer\s+/i, ''));
  }

  @Put(':id/candidatures/:userId')
  updateCandidateStatus(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: { statut: 'acceptee' | 'refusee' },
    @Headers('authorization') authorization: string,
  ) {
    return this.missionService.updateCandidateStatus(Number(id), Number(userId), body.statut, authorization?.replace(/^Bearer\s+/i, ''));
  }

  // GET ALL
  @Get()
  findAll() {
    return this.missionService.findAll();
  }

  // GET ONE
  @Get(':id')
  findOne(@Param('id') id: string, @Headers('authorization') authorization: string) {
    return this.missionService.findOne(Number(id), authorization?.replace(/^Bearer\s+/i, ''));
  }

  // UPDATE
  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<Mission>, @Headers('authorization') authorization: string) {
    return this.missionService.update(Number(id), body, authorization?.replace(/^Bearer\s+/i, ''));
  }

  // DELETE
  @Delete(':id')
  remove(@Param('id') id: string, @Headers('authorization') authorization: string) {
    return this.missionService.remove(Number(id), authorization?.replace(/^Bearer\s+/i, ''));
  }
}
