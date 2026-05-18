import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { DiscussionParticipantService } from '../discussion-participant/discussion-participant.service';
import { DiscussionParticipant } from './discussion-participant.model';

@Controller('api/discussionParticipant')
export class DiscussionParticipantController {
  constructor(private readonly discussionParticipantService: DiscussionParticipantService) {}

  // CREATE
  @Post()
  create(@Body() body: Partial<DiscussionParticipant>) { return this.discussionParticipantService.create(body); }

  // GET ALL
  @Get()
  findAll() { return this.discussionParticipantService.findAll(); }

  // GET ONE
  @Get(':id')
  findOne(@Param('id') id: string) { return this.discussionParticipantService.findOne(Number(id)); }

  // UPDATE
  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<DiscussionParticipant>) { return this.discussionParticipantService.update(Number(id), body); }

  // DELETE
  @Delete(':id')
  remove(@Param('id') id: string) { return this.discussionParticipantService.remove(Number(id)); }
}
