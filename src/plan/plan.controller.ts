import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PlanService } from './plan.service';
import { Plan } from './plan.model';

@Controller('plan')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  // CREATE
  @Post()
  async create(@Body() body: Partial<Plan>) { return this.planService.create(body);}

  // GET ALL
  @Get()
  findAll() { return this.planService.findAll();}

  // GET ONE
  @Get(':id')
  findOne(@Param('id') id: string) { return this.planService.findOne(Number(id));}

  // UPDATE
  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<Plan>) { return this.planService.update(Number(id), body);}

  // DELETE
  @Delete(':id')
  remove(@Param('id') id: string) { return this.planService.remove(Number(id));}
}