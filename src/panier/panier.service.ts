import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PanierRepository } from './panier.repository';
import { Panier } from './panier.model';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Produit } from '../produit/produit.model';

@Injectable()
export class PanierService {
  constructor(
    private readonly repo: PanierRepository,
    @InjectRepository(Produit) private readonly produits: Repository<Produit>,
  ) {}

  async getCurrentCart(utilisateurId: number) {
    let cart = await this.repo.findOne({ where: { utilisateurId, statut: 'en_cours' } });
    if (!cart) {
      cart = await this.repo.save(this.repo.create({
        utilisateurId,
        dateCommande: new Date(),
        statut: 'en_cours',
        itemsJson: [],
        quantites: [],
        produits: [],
      }));
    }
    return this.toCartResponse(cart);
  }

  async saveCurrentCart(utilisateurId: number, rawItems: unknown) {
    if (!Array.isArray(rawItems)) throw new BadRequestException('Le contenu du panier est invalide.');
    const combined = new Map<number, number>();
    for (const raw of rawItems) {
      const productId = Number(raw?.productId);
      const quantity = Number(raw?.quantity);
      if (!Number.isSafeInteger(productId) || productId <= 0 || !Number.isSafeInteger(quantity) || quantity <= 0) {
        throw new BadRequestException('Un produit ou une quantité du panier est invalide.');
      }
      combined.set(productId, (combined.get(productId) ?? 0) + quantity);
    }
    const itemsJson = [...combined].map(([productId, quantity]) => ({ productId, quantity }));
    const productRecords = itemsJson.length
      ? await this.produits.find({ where: { id: In(itemsJson.map((item) => item.productId)) } })
      : [];
    const productsById = new Map(productRecords.map((product) => [product.id, product]));
    if (productRecords.length !== itemsJson.length) throw new BadRequestException('Un ou plusieurs produits du panier n’existent plus.');
    for (const item of itemsJson) {
      const product = productsById.get(item.productId)!;
      if (item.quantity > product.stock) throw new BadRequestException(`Stock insuffisant pour « ${product.nom} ».`);
    }

    let cart = await this.repo.findOne({ where: { utilisateurId, statut: 'en_cours' } });
    if (!cart) cart = this.repo.create({ utilisateurId, dateCommande: new Date(), statut: 'en_cours' });
    cart.itemsJson = itemsJson;
    cart.quantites = itemsJson.map((item) => item.quantity);
    cart.produits = itemsJson.map((item) => productsById.get(item.productId)!);
    cart.dateCommande = new Date();
    return this.toCartResponse(await this.repo.save(cart));
  }

  async clearCurrentCart(utilisateurId: number) {
    return this.saveCurrentCart(utilisateurId, []);
  }

  private async toCartResponse(cart: Panier) {
    const items = cart.itemsJson ?? [];
    const productRecords = items.length
      ? await this.produits.find({ where: { id: In(items.map((item) => item.productId)) } })
      : [];
    const productsById = new Map(productRecords.map((product) => [product.id, product]));
    return {
      id: cart.id,
      utilisateurId: cart.utilisateurId,
      statut: cart.statut,
      items: items.flatMap((item) => {
        const product = productsById.get(item.productId);
        return product ? [{ product, quantity: item.quantity }] : [];
      }),
    };
  }

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
