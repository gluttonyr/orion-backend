import { Body, Controller, Delete, Get, Param, ParseIntPipe, Put } from '@nestjs/common';
import { DiscussionService } from './discussion.service';
import { Discussion } from './discussion.model';
import { CurrentUser, type CurrentUserClaims } from '../auth/current-user.decorator';

// Les discussions sont créées côté serveur (ex. acceptation d'une candidature à une mission).
@Controller('api/discussion')
export class DiscussionController {
  constructor(private readonly discussionService: DiscussionService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserClaims) {
    return this.discussionService.findForUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserClaims) {
    return this.discussionService.findOneForUser(id, user.id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Partial<Discussion>, @CurrentUser() user: CurrentUserClaims) {
    return this.discussionService.updateForUser(id, body, user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserClaims) {
    return this.discussionService.removeForUser(id, user.id);
  }
}
