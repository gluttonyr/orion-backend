import { Injectable, NotFoundException } from '@nestjs/common';
import { ProduitRepository } from './produit.repository';
import { Produit } from './produit.model';
import { PlanService } from '../plan/plan.service';

@Injectable()
export class ProduitService {
  constructor(private readonly repo: ProduitRepository, private readonly plans: PlanService) {}

  // CREATE
  async create(data: Partial<Produit>) {
    if (!data.proprietaireId) throw new NotFoundException('Le propriétaire du produit est requis.');
    await this.plans.assertCanCreateProduct(data.proprietaireId);
    const produit = this.repo.create(data);
    return this.repo.save(produit);
  }

  // GET ALL
  async findAll() {
    return this.repo.find({ relations: { categorie: true }, order: { id: 'DESC' } });
  }

  async findByOwner(proprietaireId: number) {
    return this.repo.find({ where: { proprietaireId }, relations: { categorie: true }, order: { id: 'DESC' } });
  }

  // GET ONE
  async findOne(id: number) {
    const produit = await this.repo.findOne({ where: { id }, relations: { categorie: true } });

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
