import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { VenteService } from './vente.service';
import { Vente } from './vente.model';

@Controller('vente')
export class VenteController {
  constructor(private readonly venteService: VenteService) {}

  // CREATE
  @Post()
  async create(@Body() body: Partial<Vente>) {
    return this.venteService.create(body);
  }

  // GET ALL
  @Get()
  async findAll() {
    return this.venteService.findAll();
  }

  // GET ONE
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.venteService.findOne(Number(id));
  }

  // UPDATE
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<Vente>,
  ) {
    return this.venteService.update(Number(id), body);
  }

  // DELETE
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.venteService.remove(Number(id));
  }
}
export { Vente };

