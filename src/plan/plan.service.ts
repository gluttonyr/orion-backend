import { Injectable, NotFoundException } from '@nestjs/common';
import { PlanRepository } from './plan.repository';
import { Plan } from './plan.model';

@Injectable()
export class PlanService {
  constructor(private readonly repo: PlanRepository) {}

  // CREATE
  create(data: Partial<Plan>) {
    const plan = this.repo.create(data);
    return this.repo.save(plan);
  }

  // GET ALL
  findAll() {
    return this.repo.find({
      relations: ['utilisateur', 'produits']
    });
  }

  // GET ONE
  async findOne(id: number) {
    const plan = await this.repo.findOne({
      where: { id },
      relations: ['utilisateur', 'produits']
    });

    if (!plan) { throw new NotFoundException(`Plan avec id ${id} introuvable`);}

    return plan;
  }

  // UPDATE
  async update(id: number, data: Partial<Plan>) {
    const plan = await this.findOne(id);

    Object.assign(plan, data);

    return this.repo.save(plan);
  }

  // DELETE
  async remove(id: number) {
    const plan = await this.findOne(id);
    return this.repo.remove(plan);
  }

  // ADD PRODUIT TO PANIER
  async addProduit(panierId: number, produitId: number, quantite: number) {
    const plan = await this.findOne(panierId);
    // Logique pour ajouter produit et quantite
    // Pour simplifier, on peut gérer les arrays
    // Mais idéalement, utiliser une entité intermédiaire
    return plan;
  }
}