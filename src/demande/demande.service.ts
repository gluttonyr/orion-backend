import { Injectable, NotFoundException } from '@nestjs/common';
import { DemandeRepository } from './demande.repository';
import { Demande } from './demande.model';

@Injectable()
export class DemandeService {
  constructor(private readonly repo: DemandeRepository) {}

  // CREATE
  async create(data: Partial<Demande>) {
    const demande = this.repo.create(data);
    return this.repo.save(demande);
  }

  // GET ALL
  async findAll() {
    return this.repo.find();
  }

  // GET ONE
  async findOne(id: number) {
    const demande = await this.repo.findOne({ where: { id } });

    if (!demande) {
      throw new NotFoundException(`Demande avec id ${id} introuvable`);
    }

    return demande;
  }

  // UPDATE
  async update(id: number, data: Partial<Demande>) {
    const demande = await this.findOne(id);

    Object.assign(demande, data);

    return this.repo.save(demande);
  }

  // DELETE
  async remove(id: number) {
    const demande = await this.findOne(id);
    return this.repo.remove(demande);
  }
}
