import { Injectable, NotFoundException } from '@nestjs/common';
import { VenteRepository } from './vente.repository';
import { Vente } from './vente.model';

@Injectable()
export class VenteService {
  constructor(private readonly repo: VenteRepository) {}

  // CREATE
  async create(data: Partial<Vente>) {
    // 🔥 génération automatique d'une référence
    data.reference = 'REF-' + Date.now();

    const vente = this.repo.create(data);
    return await this.repo.save(vente);
  }

  // GET ALL
  async findAll() {
    return await this.repo.find();
  }

  // GET ONE
  async findOne(id: number) {
    const vente = await this.repo.findOne({ where: { id } });

    if (!vente) {
      throw new NotFoundException(`Vente avec id ${id} introuvable`);
    }

    return vente;
  }

  // UPDATE
  async update(id: number, data: Partial<Vente>) {
    const vente = await this.findOne(id);

    Object.assign(vente, data);

    return await this.repo.save(vente);
  }

  // DELETE
  async remove(id: number) {
    const vente = await this.findOne(id);
    return await this.repo.remove(vente);
  }
}
