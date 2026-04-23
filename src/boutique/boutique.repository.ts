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

  // methode privee et auto de calcul de la limite de produits par boutique
  private async checkBoutiqueProductLimit(boutiqueId: number) {
    const boutique = await this.findBoutiqueById(boutiqueId);
    if (!boutique) {
      throw new Error('Boutique non trouvée.');}
    if (boutique.nombreProduits >= 30) {
      throw new Error('La boutique a atteint la limite de ' + boutique.nombreProduits + ' produits.');}
  }

  async addProduitToBoutique(boutiqueId: number, produitId: number) {
    await this.checkBoutiqueProductLimit(boutiqueId);
    const boutique = await this.findBoutiqueById(boutiqueId);
    if (!boutique) {
      throw new Error('Boutique non trouvée.');}
    if (boutique.produits.some(p => p.id === produitId)) {
      throw new Error('Le produit est déjà dans la boutique.');}
    if (boutique.produits.length <= boutique.nombreProduits) {
      throw new Error('La boutique a atteint la limite de ' + boutique.nombreProduits + ' produits.');}
    boutique.produits.push({ id: produitId } as any); // Assurez-vous que le type correspond à votre entité Produit
    boutique.nombreProduits += 1; // Incrémenter le nombre de produits
    return this.save(boutique);
  }
}