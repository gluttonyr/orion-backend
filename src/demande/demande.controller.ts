import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { DemandeService } from './demande.service';
import { Demande } from './demande.model';

@Controller('demande')
export class DemandeController {
  constructor(private readonly demandeService: DemandeService) {}

  // CREATE
  @Post()
  create(@Body() body: Partial<Demande>) {
    return this.demandeService.create(body);
  }

  // GET ALL
  @Get()
  findAll() {
    return this.demandeService.findAll();
  }

  // GET ONE
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.demandeService.findOne(Number(id));
  }

  // UPDATE
  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<Demande>) {
    return this.demandeService.update(Number(id), body);
  }

  // DELETE
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.demandeService.remove(Number(id));
  }
}