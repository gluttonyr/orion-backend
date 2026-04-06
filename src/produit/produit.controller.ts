import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ProduitService } from './produit.service';
import { Produit } from './produit.model';

@Controller('produit')
export class ProduitController {
  constructor(private readonly produitService: ProduitService) {}

  // CREATE
  @Post()
  create(@Body() body: Partial<Produit>) {
    return this.produitService.create(body);
  }

  // GET ALL
  @Get()
  findAll() {
    return this.produitService.findAll();
  }

  // GET ONE
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.produitService.findOne(Number(id));
  }

  // UPDATE
  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<Produit>) {
    return this.produitService.update(Number(id), body);
  }

  // DELETE
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.produitService.remove(Number(id));
  }
}
