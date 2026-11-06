import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { MessageService } from './message.service';
import { Message } from './message.model';
import { CurrentUser, type CurrentUserClaims } from '../auth/current-user.decorator';

@Controller('api/message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  create(@Body() body: Partial<Message>, @CurrentUser() user: CurrentUserClaims) {
    return this.messageService.create(body, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserClaims) {
    return this.messageService.findAllForUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserClaims) {
    return this.messageService.findOneForUser(id, user.id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Partial<Message>, @CurrentUser() user: CurrentUserClaims) {
    return this.messageService.update(id, body, user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserClaims) {
    return this.messageService.remove(id, user.id);
  }
}
