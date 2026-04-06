import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { MessageService } from './message.service';
import { Message } from './message.model';

@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  // CREATE
  @Post()
  create(@Body() body: Partial<Message>) {
    return this.messageService.create(body);
  }

  // GET ALL
  @Get()
  findAll() {
    return this.messageService.findAll();
  }

  // GET ONE
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.messageService.findOne(Number(id));
  }

  // UPDATE
  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<Message>) {
    return this.messageService.update(Number(id), body);
  }

  // DELETE
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.messageService.remove(Number(id));
  }
}
