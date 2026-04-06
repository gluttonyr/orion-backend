

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categorie } from './categorie.model';
import { CategorieRepository } from './categorie.repository';

@Injectable()
export class CategorieService {
  constructor(
    private readonly repo: CategorieRepository,
  ) {}

  // CREATE
  async create(data: Partial<Categorie>) {
    const categorie = this.repo.create(data);
    return await this.repo.save(categorie);
  }

  // GET ALL
  async findAll() {
    return await this.repo.find();
  }

  // GET ONE
  async findOne(id: number) {
    const categorie = await this.repo.findOne({ where: { id } });

    if (!categorie) {
      throw new NotFoundException(`Categorie avec id ${id} introuvable`);
    }

    return categorie;
  }

  // UPDATE
  async update(id: number, data: Partial<Categorie>) {
    const categorie = await this.findOne(id);

    Object.assign(categorie, data);

    return await this.repo.save(categorie);
  }

  // DELETE
  async remove(id: number) {
    const categorie = await this.findOne(id);
    return await this.repo.remove(categorie);
  }
}