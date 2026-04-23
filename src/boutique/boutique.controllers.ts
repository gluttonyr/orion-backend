import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { BoutiqueService } from './boutique.service';
import { Boutique } from './boutique.model';

@Controller('boutique')
export class BoutiqueController {
  constructor(private readonly boutiqueService: BoutiqueService) {}

  // CREATE
  @Post()
  async create(@Body() body: Partial<Boutique>) {
    return this.boutiqueService.create(body);
  }

  // GET ALL
  @Get()
  async findAll() {
    return this.boutiqueService.findAll();
  }

  // GET ONE
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.boutiqueService.findOne(Number(id));
  }

  // UPDATE
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<Boutique>,
  ) {
    return this.boutiqueService.update(Number(id), body);
  }

  // DELETE
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.boutiqueService.remove(Number(id));
  }

}