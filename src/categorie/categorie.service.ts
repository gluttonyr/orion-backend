

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
    const categories = await this.repo.find({ order: { id: 'ASC' } });
    const defaults = [
      'Électronique', 'Vêtements', 'Chaussures', 'Accessoires', 'Beauté et soins',
      'Maison et décoration', 'Alimentation', 'Santé', 'Sports et loisirs', 'Bébé et enfant',
      'Automobile et moto', 'Livres et fournitures', 'Informatique', 'Téléphones et tablettes', 'Autre',
    ];
    const existing = new Set(categories.map((category) => String((category as any)['libellé']).trim().toLocaleLowerCase()));
    const missing = defaults.filter((libellé) => !existing.has(libellé.toLocaleLowerCase()));
    if (!missing.length) return categories;
    const added = await this.repo.save(missing.map((libellé) => this.repo.create({ libellé, dexcription: libellé })));
    return [...categories, ...added];
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
