import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CategorieService } from './categorie.service';
import { Categorie } from './categorie.model';

@Controller('categorie')
export class CategorieController {
  constructor(private readonly categorieService: CategorieService) {}

  // CREATE
  @Post()
  async create(@Body() body: Partial<Categorie>) {
    return this.categorieService.create(body);
  }

  // GET ALL
  @Get()
  async findAll() {
    return this.categorieService.findAll();
  }

  // GET ONE
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.categorieService.findOne(Number(id));
  }

  // UPDATE
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<Categorie>,
  ) {
    return this.categorieService.update(Number(id), body);
  }

  // DELETE
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.categorieService.remove(Number(id));
  }
}

