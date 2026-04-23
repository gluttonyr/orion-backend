import { Injectable, NotFoundException } from '@nestjs/common';
import { PanierRepository } from './panier.repository';
import { Panier } from './panier.model';

@Injectable()
export class PanierService {
  constructor(private readonly repo: PanierRepository) {}

  // CREATE
  async create(data: Partial<Panier>) {
    const panier = this.repo.create(data);
    return this.repo.save(panier);
  }

  // GET ALL
  async findAll() {
    return this.repo.find({
      relations: ['utilisateur', 'produits']
    });
  }

  // GET ONE
  async findOne(id: number) {
    const panier = await this.repo.findOne({
      where: { id },
      relations: ['utilisateur', 'produits']
    });

    if (!panier) {
      throw new NotFoundException(`Panier avec id ${id} introuvable`);
    }

    return panier;
  }

  // GET BY UTILISATEUR
  async findByUtilisateur(utilisateurId: number) {
    return this.repo.find({
      where: { utilisateurId },
      relations: ['utilisateur', 'produits']
    });
  }

  // UPDATE
  async update(id: number, data: Partial<Panier>) {
    const panier = await this.findOne(id);

    Object.assign(panier, data);

    return this.repo.save(panier);
  }

  // DELETE
  async remove(id: number) {
    const panier = await this.findOne(id);
    return this.repo.remove(panier);
  }

  // ADD PRODUIT TO PANIER
  async addProduit(panierId: number, produitId: number, quantite: number) {
    const panier = await this.findOne(panierId);
    // Logique pour ajouter produit et quantite
    // Pour simplifier, on peut gérer les arrays
    // Mais idéalement, utiliser une entité intermédiaire
    return panier;
  }
}