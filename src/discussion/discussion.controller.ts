import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { DiscussionService } from './discussion.service';
import { Discussion } from './discussion.model';

@Controller('discussion')
export class DiscussionController {
  constructor(private readonly discussionService: DiscussionService) {}

  // CREATE
  @Post()
  create(@Body() body: Partial<Discussion>) {
    return this.discussionService.create(body);
  }

  // GET ALL
  @Get()
  findAll() {
    return this.discussionService.findAll();
  }

  // GET ONE
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.discussionService.findOne(Number(id));
  }

  // UPDATE
  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<Discussion>) {
    return this.discussionService.update(Number(id), body);
  }

  // DELETE
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.discussionService.remove(Number(id));
  }
}
