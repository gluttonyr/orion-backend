

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
    const libellé = data.libellé?.trim();
    if (!libellé) throw new BadRequestException('Le nom de la catégorie est obligatoire.');
    await this.assertNameAvailable(libellé);
    const categorie = this.repo.create({ libellé, dexcription: data.dexcription?.trim() || libellé });
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
    if (categories.length) return categories;
    return this.repo.save(defaults.map((libellé) => this.repo.create({ libellé, dexcription: libellé })));
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
    const libellé = data.libellé?.trim();
    if (!libellé) throw new BadRequestException('Le nom de la catégorie est obligatoire.');
    await this.assertNameAvailable(libellé, id);
    categorie.libellé = libellé;
    categorie.dexcription = data.dexcription?.trim() || libellé;

    return await this.repo.save(categorie);
  }

  private async assertNameAvailable(libellé: string, ignoreId?: number) {
    const normalized = libellé.toLocaleLowerCase();
    const duplicate = (await this.repo.find()).some((item) => item.id !== ignoreId && item.libellé.trim().toLocaleLowerCase() === normalized);
    if (duplicate) throw new ConflictException('Cette catégorie existe déjà.');
  }

  // DELETE
  async remove(id: number) {
    const categorie = await this.findOne(id);
    return await this.repo.remove(categorie);
  }
}
