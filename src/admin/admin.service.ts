import { Injectable, OnModuleInit } from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { InjectRepository } from '@nestjs/typeorm';
import { basename, join } from 'path';
import { In, Repository } from 'typeorm';
import { SiteSettings } from './site-settings.model';
import { Utilisateur } from '../utilisateur/utilisateur.model';
import { Vente } from '../vente/vente.model';
import { PortefeuillePlateforme } from '../plateforme/portefeuille-plateforme.model';
import { AboutTeamMember } from './about-team-member.model';
import { Produit } from '../produit/produit.model';
import { ProduitLike } from '../produit/produit-like.model';

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    @InjectRepository(SiteSettings) private readonly settingsRepo: Repository<SiteSettings>,
    @InjectRepository(Utilisateur) private readonly usersRepo: Repository<Utilisateur>,
    @InjectRepository(Vente) private readonly salesRepo: Repository<Vente>,
    @InjectRepository(PortefeuillePlateforme) private readonly walletRepo: Repository<PortefeuillePlateforme>,
    @InjectRepository(AboutTeamMember) private readonly teamRepo: Repository<AboutTeamMember>,
    @InjectRepository(Produit) private readonly productsRepo: Repository<Produit>,
    @InjectRepository(ProduitLike) private readonly likesRepo: Repository<ProduitLike>,
  ) {}

  async onModuleInit() {
    if (!await this.settingsRepo.findOne({ where: { id: 1 } })) {
      await this.settingsRepo.save({ id: 1, heroImagesJson: '[]', carouselImagesJson: '[]' });
    }
  }

  async getUsers() {
    const users = await this.usersRepo.find({ order: { id: 'DESC' } });
    return users.map(({ password: _password, ...user }) => user);
  }

  getOrders() {
    return this.salesRepo.find({
      relations: ['produits', 'utilisateur'],
      order: { date_achat: 'DESC' },
    });
  }

  async getPlatformWallet() {
    return (await this.walletRepo.findOne({ where: { id: 1 } })) ?? {
      id: 1, solde: 0, totalCommissions: 0, totalRemboursements: 0, updatedAt: null,
    };
  }

  async getDashboardStats() {
    const [users, merchants, products, publishedProducts, paidSales, totalSales, likes] = await Promise.all([
      this.usersRepo.count(),
      this.usersRepo.count({ where: { role: 'COMMERCANT' as any } }),
      this.productsRepo.count(),
      this.productsRepo.createQueryBuilder('product').where('product.statut != :draft', { draft: 'Brouillon' }).getCount(),
      this.salesRepo.createQueryBuilder('sale').select('COUNT(*)', 'count').addSelect('COALESCE(SUM(sale.prix_total), 0)', 'revenue').where('sale.statut = :status', { status: 'payee' }).getRawOne<{ count: string; revenue: string }>(),
      this.salesRepo.count(),
      this.likesRepo.count(),
    ]);

    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    start.setMonth(start.getMonth() - 5);
    const monthlyRows = await this.salesRepo.createQueryBuilder('sale')
      .select("DATE_TRUNC('month', sale.date_achat)", 'month')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('COALESCE(SUM(sale.prix_total), 0)', 'revenue')
      .where('sale.statut = :status', { status: 'payee' })
      .andWhere('sale.date_achat >= :start', { start })
      .groupBy("DATE_TRUNC('month', sale.date_achat)")
      .orderBy("DATE_TRUNC('month', sale.date_achat)", 'ASC')
      .getRawMany<{ month: Date | string; orders: string; revenue: string }>();
    const monthLookup = new Map(monthlyRows.map((row) => {
      const date = new Date(row.month);
      return [`${date.getFullYear()}-${date.getMonth()}`, { orders: Number(row.orders), revenue: Number(row.revenue) }];
    }));
    const monthlySales = Array.from({ length: 6 }, (_, index) => {
      const month = new Date(start.getFullYear(), start.getMonth() + index, 1);
      const value = monthLookup.get(`${month.getFullYear()}-${month.getMonth()}`) ?? { orders: 0, revenue: 0 };
      return { month: month.toISOString(), label: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(month), ...value };
    });

    const roleCounts = await Promise.all([
      this.usersRepo.count({ where: { role: 'UTILISATEUR' as any } }),
      merchants,
      this.usersRepo.count({ where: { role: 'ADMIN' as any } }),
    ]);
    const topLikedProducts = await this.likesRepo.createQueryBuilder('like')
      .innerJoin(Produit, 'product', 'product.id = like.produitId')
      .select('product.id', 'id')
      .addSelect('product.nom', 'name')
      .addSelect('COUNT(like.id)', 'likes')
      .groupBy('product.id')
      .addGroupBy('product.nom')
      .orderBy('COUNT(like.id)', 'DESC')
      .addOrderBy('product.nom', 'ASC')
      .limit(5)
      .getRawMany<{ id: string; name: string; likes: string }>();

    return {
      users,
      merchants,
      products,
      publishedProducts,
      paidOrders: Number(paidSales?.count ?? 0),
      allOrders: totalSales,
      revenue: Number(paidSales?.revenue ?? 0),
      averageOrder: Number(paidSales?.count ?? 0) > 0 ? Number(paidSales?.revenue ?? 0) / Number(paidSales?.count) : 0,
      totalLikes: likes,
      userRoles: [
        { name: 'Clients', value: roleCounts[0] },
        { name: 'Commerçants', value: roleCounts[1] },
        { name: 'Administrateurs', value: roleCounts[2] },
      ],
      monthlySales,
      topLikedProducts: topLikedProducts.map((row) => ({ id: Number(row.id), name: row.name, likes: Number(row.likes) })),
    };
  }

  async getSiteSettings() {
    const settings = await this.ensureSettings();
    return {
      heroImages: this.decode(settings.heroImagesJson),
      carouselProductIds: this.decode(settings.carouselImagesJson).map(Number).filter((id) => Number.isSafeInteger(id) && id > 0),
      updatedAt: settings.updatedAt,
    };
  }

  async getMerchants() {
    const merchants = await this.usersRepo.find({ where: { role: 'COMMERCANT' as any }, order: { nom: 'ASC', prenom: 'ASC' } });
    return merchants.map(({ id, nom, prenom, email }) => ({ id, nom, prenom, email }));
  }

  async getMerchantProducts(merchantId: number) {
    const merchant = await this.usersRepo.findOne({ where: { id: merchantId, role: 'COMMERCANT' as any } });
    if (!merchant) throw new Error('Ce marchand est introuvable.');
    const products = await this.productsRepo.find({ where: { proprietaireId: merchantId }, relations: { categorie: true }, order: { id: 'DESC' } });
    return products.filter((product) => product.statut !== 'Brouillon');
  }

  async getCarouselProducts() {
    const settings = await this.ensureSettings();
    const ids = this.decode(settings.carouselImagesJson).map(Number).filter((id) => Number.isSafeInteger(id) && id > 0);
    if (!ids.length) return [];
    const products = await this.productsRepo.find({ where: { id: In(ids) }, relations: { categorie: true } });
    return ids.map((id) => products.find((product) => product.id === id)).filter((product): product is Produit => !!product && product.statut !== 'Brouillon');
  }

  getAboutTeam() {
    return this.teamRepo.find({ order: { position: 'ASC', id: 'ASC' } });
  }

  async saveAboutTeamMember(input: { name: string; role: string; bio?: string; position?: number }, photo?: string, id?: number) {
    const name = input.name?.trim();
    const role = input.role?.trim();
    if (!name || !role) throw new Error('Le nom et la fonction sont obligatoires.');
    const member = id ? await this.teamRepo.findOneBy({ id }) : this.teamRepo.create();
    if (!member) throw new Error('Ce profil est introuvable.');
    member.name = name;
    member.role = role;
    member.bio = input.bio?.trim() ?? member.bio ?? '';
    member.position = Number.isInteger(Number(input.position)) ? Number(input.position) : member.position ?? 0;
    if (photo) member.photo = photo;
    return this.teamRepo.save(member);
  }

  async deleteAboutTeamMember(id: number) {
    const result = await this.teamRepo.delete(id);
    if (!result.affected) throw new Error('Ce profil est introuvable.');
    return { success: true };
  }

  async updateSiteSettings(
    input: { heroImages?: string; carouselProductIds?: string },
    files: { heroImagesFiles?: Express.Multer.File[] },
  ) {
    const settings = await this.ensureSettings();
    const previousHeroImages = this.decode(settings.heroImagesJson);
    const previousCarouselValues = this.decode(settings.carouselImagesJson);
    const heroFiles = files.heroImagesFiles ?? [];
    const heroImages = [
      ...this.parseInput(input.heroImages, this.decode(settings.heroImagesJson)),
      ...heroFiles.map((file) => file.filename),
    ];
    const carouselProductIds = [...new Set(this.parseInput(input.carouselProductIds, previousCarouselValues)
      .map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))];
    if (heroImages.length > 3) throw new Error('La page d’accueil accepte au maximum trois images d’en-tête.');
    if (carouselProductIds.length > 10) throw new Error('Le carrousel accepte au maximum dix produits.');
    const carouselProducts = carouselProductIds.length ? await this.productsRepo.find({ where: { id: In(carouselProductIds) } }) : [];
    if (carouselProducts.length !== carouselProductIds.length || carouselProducts.some((product) => product.statut === 'Brouillon')) {
      throw new Error('Un ou plusieurs produits sélectionnés ne sont plus publiés.');
    }
    settings.heroImagesJson = JSON.stringify(heroImages);
    settings.carouselImagesJson = JSON.stringify(carouselProductIds.map(String));
    await this.settingsRepo.save(settings);
    const retainedImages = new Set(heroImages);
    const removedImages = new Set([...previousHeroImages, ...previousCarouselValues.filter((image) => image.startsWith('site-'))].filter((image) => !retainedImages.has(image)));
    const uploadDirectory = process.env.UPLOAD_PATH || './uploads';
    for (const image of removedImages) {
      if (!image.startsWith('site-') || basename(image) !== image) continue;
      const filePath = join(uploadDirectory, image);
      if (existsSync(filePath)) {
        try { unlinkSync(filePath); } catch { /* Keep settings saved if an old file cannot be removed. */ }
      }
    }
    return this.getSiteSettings();
  }

  private async ensureSettings() {
    let settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (!settings) settings = await this.settingsRepo.save({ id: 1, heroImagesJson: '[]', carouselImagesJson: '[]' });
    return settings;
  }

  private decode(value: string): string[] {
    try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : []; }
    catch { return []; }
  }

  private parseInput(value: string | undefined, fallback: string[]) {
    if (!value) return fallback;
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((entry): entry is string | number => typeof entry === 'string' || typeof entry === 'number').map(String)
        : fallback;
    } catch { return fallback; }
  }
}
