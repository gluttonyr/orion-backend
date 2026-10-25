import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProduitRepository } from './produit.repository';
import { Produit } from './produit.model';
import { ProduitLike } from './produit-like.model';
import { PlanService } from '../plan/plan.service';
import { Utilisateur } from '../utilisateur/utilisateur.model';
import { Boutique } from '../boutique/boutique.model';

@Injectable()
export class ProduitService {
  constructor(
    private readonly repo: ProduitRepository,
    private readonly plans: PlanService,
    @InjectRepository(ProduitLike) private readonly likes: Repository<ProduitLike>,
    @InjectRepository(Utilisateur) private readonly users: Repository<Utilisateur>,
    @InjectRepository(Boutique) private readonly stores: Repository<Boutique>,
  ) {}

  // CREATE
  async create(data: Partial<Produit>) {
    if (!data.proprietaireId) throw new NotFoundException('Le propriétaire du produit est requis.');
    await this.plans.assertCanCreateProduct(data.proprietaireId);
    data.prixPromotionnel = this.validatePromotionalPrice(data.prixPromotionnel, Number(data.prix));
    const produit = this.repo.create({ ...data, statut: 'Brouillon' });
    return this.repo.save(produit);
  }

  // GET ALL
  async findAll() {
    const products = (await this.repo.find({ relations: { categorie: true }, order: { id: 'DESC' } }))
      .filter((product) => product.statut !== 'Brouillon');
    const ownerIds = [...new Set(products.map((product) => product.proprietaireId).filter((id): id is number => Number.isInteger(id)))];
    const owners = ownerIds.length ? await this.users.find({ where: { id: In(ownerIds) }, select: { id: true, pays: true, localisation: true } }) : [];
    const ownerById = new Map(owners.map((owner) => [owner.id, owner]));
    const storeRecords = ownerIds.length ? await this.stores.find({ where: { proprietaireId: In(ownerIds) }, select: { id: true, nom: true, proprietaireId: true } }) : [];
    const storeByOwnerId = new Map(storeRecords.map((store) => [store.proprietaireId, store]));
    return products.map((product) => {
      const owner = product.proprietaireId ? ownerById.get(product.proprietaireId) : undefined;
      const store = product.proprietaireId ? storeByOwnerId.get(product.proprietaireId) : undefined;
      return { ...product, boutiqueId: store?.id ?? null, boutiqueNom: store?.nom ?? null, pays: owner?.pays || null, localisation: owner?.localisation || null };
    });
  }

  async searchPublished(query: string, limit = 5) {
    const normalizedQuery = this.normalizeSearchText(query);
    if (normalizedQuery.length < 2) return [];
    const boundedLimit = Math.min(50, Math.max(1, Math.floor(limit) || 5));
    const products = await this.repo.createQueryBuilder('product')
      .leftJoinAndSelect('product.categorie', 'category')
      .where('product.statut <> :draft', { draft: 'Brouillon' })
      .getMany();
    return products
      .map((product) => ({ product, score: this.scoreProductSearch(product, normalizedQuery) }))
      .filter(({ score }) => score >= 0.28)
      .sort((a, b) => b.score - a.score || a.product.id - b.product.id)
      .slice(0, boundedLimit)
      .map(({ product }) => product);
  }

  private scoreProductSearch(product: Produit, query: string): number {
    const name = this.normalizeSearchText(product.nom);
    const category = this.normalizeSearchText(product.categorie?.libellé ?? '');
    const description = this.normalizeSearchText(product.description);
    if (name === query) return 1;
    if (name.includes(query)) return 0.98;
    const nameScore = this.fuzzyTextScore(query, name);
    const categoryScore = this.fuzzyTextScore(query, category) * 0.72;
    const descriptionScore = this.fuzzyTextScore(query, description) * 0.42;
    return Math.max(nameScore, categoryScore, descriptionScore);
  }

  private fuzzyTextScore(query: string, candidate: string): number {
    if (!candidate) return 0;
    if (candidate.includes(query)) return 0.96;
    const queryTokens = query.split(' ').filter(Boolean);
    const candidateTokens = candidate.split(' ').filter(Boolean);
    const tokenScores = queryTokens.map((queryToken) => Math.max(
      ...candidateTokens.map((candidateToken) => this.stringSimilarity(queryToken, candidateToken)),
      0,
    ));
    const average = tokenScores.reduce((sum, score) => sum + score, 0) / tokenScores.length;
    const phraseSimilarity = this.stringSimilarity(query, candidate);
    return Math.max(average, phraseSimilarity * 0.88);
  }

  private stringSimilarity(left: string, right: string): number {
    if (left === right) return 1;
    if (!left || !right) return 0;
    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let row = 1; row <= left.length; row += 1) {
      let diagonal = previous[0];
      previous[0] = row;
      for (let column = 1; column <= right.length; column += 1) {
        const above = previous[column];
        const cost = left[row - 1] === right[column - 1] ? 0 : 1;
        previous[column] = Math.min(previous[column] + 1, previous[column - 1] + 1, diagonal + cost);
        diagonal = above;
      }
    }
    return 1 - previous[right.length] / Math.max(left.length, right.length);
  }

  private normalizeSearchText(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr-FR').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }

  async findPublishedOne(id: number) {
    const produit = await this.findOne(id);
    if (produit.statut === 'Brouillon') throw new NotFoundException(`Produit avec id ${id} introuvable`);
    const store = produit.proprietaireId ? await this.stores.findOne({ where: { proprietaireId: produit.proprietaireId }, select: { id: true, nom: true, proprietaireId: true } }) : null;
    return { ...produit, boutiqueId: store?.id ?? null, boutiqueNom: store?.nom ?? null };
  }

  async findByOwner(proprietaireId: number) {
    const products = await this.repo.find({ where: { proprietaireId }, relations: { categorie: true }, order: { id: 'DESC' } });
    const counts = await this.getLikeCounts(products.map(({ id }) => id));
    return products.map((product) => ({ ...product, likesCount: counts.get(product.id) ?? 0 }));
  }

  async setProductLike(productId: number, visitorId: string, liked: boolean) {
    await this.findPublishedOne(productId);
    if (liked) {
      await this.likes.createQueryBuilder()
        .insert()
        .into(ProduitLike)
        .values({ produitId: productId, visitorId })
        .orIgnore()
        .execute();
    } else {
      await this.likes.delete({ produitId: productId, visitorId });
    }
    return { count: await this.likes.count({ where: { produitId: productId } }), liked };
  }

  private async getLikeCounts(productIds: number[]): Promise<Map<number, number>> {
    if (!productIds.length) return new Map();
    const rows = await this.likes.createQueryBuilder('like')
      .select('like.produitId', 'produitId')
      .addSelect('COUNT(*)', 'count')
      .where('like.produitId IN (:...productIds)', { productIds })
      .groupBy('like.produitId')
      .getRawMany<{ produitId: string; count: string }>();
    return new Map(rows.map((row) => [Number(row.produitId), Number(row.count)]));
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

    if (Object.prototype.hasOwnProperty.call(data, 'prixPromotionnel')) {
      const regularPrice = data.prix === undefined ? Number(produit.prix) : Number(data.prix);
      data.prixPromotionnel = this.validatePromotionalPrice(data.prixPromotionnel, regularPrice);
    } else if (data.prix !== undefined && produit.prixPromotionnel !== null) {
      this.validatePromotionalPrice(produit.prixPromotionnel, Number(data.prix));
    }

    Object.assign(produit, data);

    return this.repo.save(produit);
  }

  async publish(id: number) {
    const produit = await this.findOne(id);
    produit.statut = Number(produit.stock) > 0 ? 'Disponible' : 'Rupture de stock';
    return this.repo.save(produit);
  }

  // DELETE
  async remove(id: number) {
    const produit = await this.findOne(id);
    return this.repo.remove(produit);
  }

  private validatePromotionalPrice(value: unknown, regularPrice: number): number | null {
    if (value === undefined || value === null || value === '') return null;
    const promotionalPrice = Number(value);
    if (!Number.isSafeInteger(promotionalPrice) || promotionalPrice <= 0 || !Number.isFinite(regularPrice) || promotionalPrice >= regularPrice) {
      throw new BadRequestException('Le prix promotionnel doit être un montant XOF entier, positif et inférieur au prix normal.');
    }
    return promotionalPrice;
  }
}
