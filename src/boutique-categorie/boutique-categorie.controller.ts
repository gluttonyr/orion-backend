import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { BoutiqueCategorieService } from './boutique-categorie.service';

@Controller('boutique-categories')
export class BoutiqueCategorieController {
  constructor(private readonly service: BoutiqueCategorieService) {}

  @Get()
  @Public()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() body: { nom?: string }) {
    return this.service.create(body ?? {});
  }

  @Put(':id')
  @Roles('ADMIN')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: { nom?: string }) {
    return this.service.update(id, body ?? {});
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
