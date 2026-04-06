import { Injectable, NotFoundException } from '@nestjs/common';
import { ProduitRepository } from './produit.repository';
import { Produit } from './produit.model';

@Injectable()
export class ProduitService {
  constructor(private readonly repo: ProduitRepository) {}

  // CREATE
  async create(data: Partial<Produit>) {
    const produit = this.repo.create(data);
    return this.repo.save(produit);
  }

  // GET ALL
  async findAll() {
    return this.repo.find();
  }

  // GET ONE
  async findOne(id: number) {
    const produit = await this.repo.findOne({ where: { id } });

    if (!produit) {
      throw new NotFoundException(`Produit avec id ${id} introuvable`);
    }

    return produit;
  }

  // UPDATE
  async update(id: number, data: Partial<Produit>) {
    const produit = await this.findOne(id);

    Object.assign(produit, data);

    return this.repo.save(produit);
  }

  // DELETE
  async remove(id: number) {
    const produit = await this.findOne(id);
    return this.repo.remove(produit);
  }
}
