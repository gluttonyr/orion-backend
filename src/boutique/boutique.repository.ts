import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Boutique } from './boutique.model';

@Injectable()
export class BoutiqueRepository extends Repository<Boutique> {
  constructor(private dataSource: DataSource) {
    super(Boutique, dataSource.createEntityManager());
  }

  async createBoutique(data: Partial<Boutique>) {
    const boutique = this.create(data);
    return this.save(boutique);
  }

  async findAllBoutiques() {
    return this.find({
      relations: ['produits'],
    });
  }

  async findBoutiquesByOwner(proprietaireId: number) {
    return this.find({ where: { proprietaireId }, relations: ['produits'], order: { dateCreation: 'DESC' } });
  }

  async countBoutiquesByOwner(proprietaireId: number) {
    return this.count({ where: { proprietaireId } });
  }

  async findBoutiqueById(id: number) {
    return this.findOne({
      where: { id },
      relations: ['produits'],
    });
  }

  async updateBoutique(id: number, data: Partial<Boutique>) {
    await this.update(id, data);
    return this.findBoutiqueById(id);
  }

  async deleteBoutique(id: number) { return this.delete(id);}

  // Vérifie la limite du forfait Standard pour les produits associés à la boutique.
  private async checkBoutiqueProductLimit(boutiqueId: number) {
    const boutique = await this.findBoutiqueById(boutiqueId);
    if (!boutique) {
      throw new Error('Boutique non trouvée.');}
    if (boutique.produits.length >= 40) {
      throw new Error('La boutique a atteint la limite de 40 produits de l’abonnement Standard.');}
  }

  async addProduitToBoutique(boutiqueId: number, produitId: number) {
    await this.checkBoutiqueProductLimit(boutiqueId);
    const boutique = await this.findBoutiqueById(boutiqueId);
    if (!boutique) {
      throw new Error('Boutique non trouvée.');}
    if (boutique.produits.some(p => p.id === produitId)) {
      throw new Error('Le produit est déjà dans la boutique.');}
    boutique.produits.push({ id: produitId } as any); // Assurez-vous que le type correspond à votre entité Produit
    boutique.nombreProduits += 1; // Incrémenter le nombre de produits
    return this.save(boutique);
  }
}
