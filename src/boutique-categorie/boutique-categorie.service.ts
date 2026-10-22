import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoutiqueCategorie } from './boutique-categorie.model';

@Injectable()
export class BoutiqueCategorieService implements OnModuleInit {
  constructor(@InjectRepository(BoutiqueCategorie) private readonly repository: Repository<BoutiqueCategorie>) {}

  async onModuleInit() {
    await this.repository.upsert(
      [{ nom: 'Mode & accessoires' }, { nom: 'Maison & décoration' }],
      ['nom'],
    );
  }

  findAll() {
    return this.repository.find({ order: { nom: 'ASC' } });
  }

  async findByName(nom: string) {
    return this.repository.findOne({ where: { nom: nom.trim() } });
  }

  async create(data: { nom?: string }) {
    const nom = data.nom?.trim();
    if (!nom) throw new BadRequestException('Le nom de la catégorie est obligatoire.');
    try {
      return await this.repository.save(this.repository.create({ nom }));
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') throw new ConflictException('Cette catégorie existe déjà.');
      throw error;
    }
  }

  async update(id: number, data: { nom?: string }) {
    const categorie = await this.repository.findOne({ where: { id } });
    if (!categorie) throw new NotFoundException('Catégorie de boutique introuvable.');
    const nom = data.nom?.trim();
    if (!nom) throw new BadRequestException('Le nom de la catégorie est obligatoire.');
    categorie.nom = nom;
    try {
      return await this.repository.save(categorie);
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') throw new ConflictException('Cette catégorie existe déjà.');
      throw error;
    }
  }

  async remove(id: number) {
    const categorie = await this.repository.findOne({ where: { id } });
    if (!categorie) throw new NotFoundException('Catégorie de boutique introuvable.');
    await this.repository.remove(categorie);
    return { success: true };
  }
}
