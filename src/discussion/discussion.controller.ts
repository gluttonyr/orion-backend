import { Body, Controller, Delete, Get, Param, Post, Put, Req, UnauthorizedException } from '@nestjs/common';
import { DiscussionService } from './discussion.service';
import { Discussion } from './discussion.model';
import type { Request } from 'express';

type AuthenticatedRequest = Request & { user?: { sub?: string | number } };

@Controller('api/discussion')
export class DiscussionController {
  constructor(private readonly discussionService: DiscussionService) {}

  // CREATE
  @Post()
  create(@Body() body: Partial<Discussion>) { return this.discussionService.create(body); }

  // GET ALL
  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    const userId = Number(request.user?.sub);
    if (!Number.isSafeInteger(userId) || userId <= 0) throw new UnauthorizedException('Session invalide.');
    return this.discussionService.findForUser(userId);
  }

  // GET ONE
  @Get(':id')
  findOne(@Param('id') id: string) { return this.discussionService.findOne(Number(id)); }

  // UPDATE
  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<Discussion>) { return this.discussionService.update(Number(id), body); }

  // DELETE
  @Delete(':id')
  remove(@Param('id') id: string) { return this.discussionService.remove(Number(id)); }
}
