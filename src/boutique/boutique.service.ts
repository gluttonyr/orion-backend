import { Injectable, NotFoundException } from '@nestjs/common';
import { BoutiqueRepository } from './boutique.repository';
import { Boutique } from './boutique.model';

@Injectable()
export class BoutiqueService {
  constructor(private readonly boutiqueRepository: BoutiqueRepository) {}

  async create(data: Partial<Boutique>) {
    data.dateCreation = new Date(); // auto date
    return this.boutiqueRepository.createBoutique(data);
  }

  async findAll() {
    return this.boutiqueRepository.findAllBoutiques();
  }

  async findOne(id: number) {
    const boutique = await this.boutiqueRepository.findBoutiqueById(id);
    if (!boutique) {
      throw new NotFoundException('Boutique non trouvée');
    }
    return boutique;
  }

  async update(id: number, data: Partial<Boutique>) {
    const boutique = await this.findOne(id);
    return this.boutiqueRepository.updateBoutique(boutique.id, data);
  }

  async remove(id: number) {
    const boutique = await this.findOne(id);
    return this.boutiqueRepository.deleteBoutique(boutique.id);
  }
}