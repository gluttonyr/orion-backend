import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProduitRepository } from './produit.repository';
import { Produit } from './produit.model';
import { ProduitLike } from './produit-like.model';
import { PlanService } from '../plan/plan.service';

@Injectable()
export class ProduitService {
  constructor(
    private readonly repo: ProduitRepository,
    private readonly plans: PlanService,
    @InjectRepository(ProduitLike) private readonly likes: Repository<ProduitLike>,
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
    return (await this.repo.find({ relations: { categorie: true }, order: { id: 'DESC' } }))
      .filter((produit) => produit.statut !== 'Brouillon');
  }

  async findPublishedOne(id: number) {
    const produit = await this.findOne(id);
    if (produit.statut === 'Brouillon') throw new NotFoundException(`Produit avec id ${id} introuvable`);
    return produit;
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
