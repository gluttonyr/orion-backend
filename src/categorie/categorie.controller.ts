import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CategorieService } from './categorie.service';
import { Categorie } from './categorie.model';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';

@Controller('categorie')
export class CategorieController {
  constructor(private readonly categorieService: CategorieService) {}

  // CREATE
  @Post()
  @Roles('ADMIN')
  async create(@Body() body: Partial<Categorie>) {
    return this.categorieService.create(body);
  }

  // GET ALL
  @Get()
  @Public()
  async findAll() {
    return this.categorieService.findAll();
  }

  // GET ONE
  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    return this.categorieService.findOne(Number(id));
  }

  // UPDATE
  @Put(':id')
  @Roles('ADMIN')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<Categorie>,
  ) {
    return this.categorieService.update(Number(id), body);
  }

  // DELETE
  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    return this.categorieService.remove(Number(id));
  }
}

