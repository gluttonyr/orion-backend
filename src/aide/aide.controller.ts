import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { AideService, type AideCategorieInput, type AideQuestionInput } from './aide.service';

@Controller('aide')
export class AideController {
  constructor(private readonly service: AideService) {}

  @Get()
  @Public()
  findAll() {
    return this.service.findAll();
  }

  @Post('categories')
  @Roles('ADMIN')
  createCategorie(@Body() body: AideCategorieInput) {
    return this.service.createCategorie(body ?? {});
  }

  @Put('categories/:id')
  @Roles('ADMIN')
  updateCategorie(@Param('id', ParseIntPipe) id: number, @Body() body: AideCategorieInput) {
    return this.service.updateCategorie(id, body ?? {});
  }

  @Delete('categories/:id')
  @Roles('ADMIN')
  removeCategorie(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeCategorie(id);
  }

  @Post('questions')
  @Roles('ADMIN')
  createQuestion(@Body() body: AideQuestionInput) {
    return this.service.createQuestion(body ?? {});
  }

  @Put('questions/:id')
  @Roles('ADMIN')
  updateQuestion(@Param('id', ParseIntPipe) id: number, @Body() body: AideQuestionInput) {
    return this.service.updateQuestion(id, body ?? {});
  }

  @Delete('questions/:id')
  @Roles('ADMIN')
  removeQuestion(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeQuestion(id);
  }
}
