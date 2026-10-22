import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { VenteRepository } from './vente.repository';
import { Vente } from './vente.model';
import { DataSource, In, Repository } from 'typeorm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { VenteRemise } from './vente-remise.model';
import { getProductSellingPrice, Produit } from '../produit/produit.model';
import { createHash, randomBytes } from 'crypto';
import * as QRCode from 'qrcode';
import { NotificationService } from '../notification/notification.service';
import { PlateformeFinanceService } from '../plateforme/plateforme-finance.service';

@Injectable()
export class VenteService {
  constructor(
    private readonly repo: VenteRepository,
    @InjectRepository(VenteRemise) private readonly remises: Repository<VenteRemise>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    private readonly plateformeFinance: PlateformeFinanceService,
  ) {}

  // CREATE
  async create(data: Partial<Vente>) {
    if (data.produits?.some((product) => product.statut === 'Brouillon')) {
      throw new BadRequestException('Un produit en brouillon ne peut pas être commandé.');
    }
    // 🔥 génération automatique d'une référence
    data.reference = 'REF-' + Date.now();

    const vente = this.repo.create(data);
    return await this.repo.save(vente);
  }

  // GET ALL
  async findAll() {
    return await this.repo.find();
  }

  async findByUtilisateur(utilisateurId: number) {
    const sales = await this.repo.find({
      where: { utilisateurId, statut: In(['payee', 'remboursee']) },
      relations: ['produits'],
      order: { date_achat: 'DESC' },
    });
    if (!sales.length) return [];
    const remises = await this.remises.find({ where: { venteId: In(sales.map((sale) => sale.id)) } });
    return sales.map((sale) => ({
      ...sale,
      remises: remises.filter((remise) => remise.venteId === sale.id).map((remise) => ({
        id: remise.id, commercantId: remise.commercantId, montant: remise.montant,
        articles: JSON.parse(remise.articlesJson), statut: remise.statut, dateRemise: remise.dateRemise,
      })),
    }));
  }

  async walletForMerchant(merchantId: number) {
    const rows = await this.remises.find({ where: { commercantId: merchantId }, order: { updatedAt: 'DESC' } });
    const totals = rows.reduce((result, row) => {
      if (row.statut === 'bloquee') result.bloque += row.montant;
      if (row.statut === 'liberee') result.disponible += row.montant;
      if (row.statut === 'remboursee') result.rembourse += row.montant;
      return result;
    }, { disponible: 0, bloque: 0, rembourse: 0 });
    return {
      ...totals,
      devise: 'XOF',
      versementAutomatiqueActif: false,
      messageVersement: 'Les montants libérés sont comptabilisés dans Orion. Le versement Mobile Money nécessite l’activation des payouts FedaPay.',
      mouvements: rows.map((row) => ({
        id: row.id, venteId: row.venteId, montant: row.montant, statut: row.statut,
        montantBrut: row.montantBrut ?? row.montant, commissionMontant: row.commissionMontant ?? 0, commissionPourcentage: row.commissionPourcentage ?? 0,
        articles: JSON.parse(row.articlesJson), date: row.updatedAt,
      })),
    };
  }

  async findMerchantSales(merchantId: number) {
    const remises = await this.remises.find({ where: { commercantId: merchantId }, order: { updatedAt: 'DESC' } });
    const sales = remises.length ? await this.repo.find({ where: { id: In(remises.map((remise) => remise.venteId)) } }) : [];
    const salesById = new Map(sales.map((sale) => [sale.id, sale]));
    return remises.map((remise) => ({
      remiseId: remise.id, venteId: remise.venteId, montant: remise.montant,
      montantBrut: remise.montantBrut || remise.montant, commissionMontant: remise.commissionMontant ?? 0,
      commissionPourcentage: remise.commissionPourcentage ?? 0, statut: remise.statut,
      articles: JSON.parse(remise.articlesJson),
      date: salesById.get(remise.venteId)?.date_achat ?? remise.createdAt,
      vente: salesById.has(remise.venteId) ? {
        reference: salesById.get(remise.venteId)?.reference,
        date_achat: salesById.get(remise.venteId)?.date_achat,
        statut: salesById.get(remise.venteId)?.statut,
      } : undefined,
    }));
  }

  async getMerchantAnalytics(merchantId: number, from?: string, to?: string) {
    const start = from ? new Date(`${from}T00:00:00.000Z`) : new Date(Date.now() - 29 * 86400000);
    const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) {
      throw new BadRequestException('Période analytique invalide.');
    }

    const rows = await this.remises.find({ where: { commercantId: merchantId, statut: In(['bloquee', 'liberee']) }, order: { updatedAt: 'DESC' } });
    if (!rows.length) return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10), summary: { revenue: 0, orderCount: 0, unitsSold: 0, averageOrderValue: 0 }, series: [], topProducts: [], recentOrders: [] };

    const sales = await this.repo.find({ where: { id: In(rows.map((row) => row.venteId)), statut: 'payee' } });
    const salesById = new Map(sales.map((sale) => [sale.id, sale]));
    const days = new Map<string, { revenue: number; orders: number; units: number }>();
    const products = new Map<number, { produitId: number; name: string; quantity: number; revenue: number; orders: Set<number> }>();
    const recentOrders: Array<{ venteId: number; reference: string; date: string; montant: number; statut: string; articles: Array<{ produitId: number; nom: string; quantite: number; prixUnitaire: number }> }> = [];
    let revenue = 0;
    let unitsSold = 0;
    const includedSaleIds = new Set<number>();

    for (const row of rows) {
      const sale = salesById.get(row.venteId);
      if (!sale) continue;
      const saleDate = new Date(sale.date_achat);
      if (!Number.isFinite(saleDate.getTime()) || saleDate < start || saleDate > end) continue;
      let articles: Array<{ produitId: number; nom: string; quantite: number; prixUnitaire: number }> = [];
      try {
        const decoded: unknown = JSON.parse(row.articlesJson);
        if (Array.isArray(decoded)) articles = decoded;
      } catch { articles = []; }

      const day = saleDate.toISOString().slice(0, 10);
      const bucket = days.get(day) ?? { revenue: 0, orders: 0, units: 0 };
      bucket.revenue += row.montant;
      bucket.units += articles.reduce((sum, article) => sum + Math.max(0, Number(article.quantite) || 0), 0);
      days.set(day, bucket);
      revenue += row.montant;
      for (const article of articles) {
        const quantity = Math.max(0, Number(article.quantite) || 0);
        const productId = Number(article.produitId);
        if (!Number.isSafeInteger(productId)) continue;
        const aggregate = products.get(productId) ?? { produitId: productId, name: article.nom || `Produit ${productId}`, quantity: 0, revenue: 0, orders: new Set<number>() };
        aggregate.quantity += quantity;
        aggregate.revenue += quantity * (Number(article.prixUnitaire) || 0);
        aggregate.orders.add(sale.id);
        products.set(productId, aggregate);
        unitsSold += quantity;
      }
      if (!includedSaleIds.has(sale.id)) {
        includedSaleIds.add(sale.id);
        bucket.orders += 1;
        recentOrders.push({ venteId: sale.id, reference: sale.reference, date: saleDate.toISOString(), montant: row.montant, statut: sale.statut, articles });
      }
    }

    return {
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
      summary: { revenue, orderCount: includedSaleIds.size, unitsSold, averageOrderValue: includedSaleIds.size ? Math.round(revenue / includedSaleIds.size) : 0 },
      series: [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => ({ date, ...values })),
      topProducts: [...products.values()].map(({ orders, ...product }) => ({ ...product, orders: orders.size })).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue).slice(0, 10),
      recentOrders: recentOrders.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    };
  }

  async createPaidRemises(venteId: number, products: Produit[], quantities: number[], unitPrices?: number[]) {
    const grouped = new Map<number, { montant: number; articles: Array<{ produitId: number; nom: string; quantite: number; prixUnitaire: number }> }>();
    products.forEach((product, index) => {
      if (!product.proprietaireId) return;
      const quantity = Number(quantities[index] ?? 1);
      const current = grouped.get(product.proprietaireId) ?? { montant: 0, articles: [] };
      const unitPrice = Number(unitPrices?.[index] ?? getProductSellingPrice(product));
      current.montant += Math.round(unitPrice * quantity);
      current.articles.push({ produitId: product.id, nom: product.nom, quantite: quantity, prixUnitaire: unitPrice });
      grouped.set(product.proprietaireId, current);
    });
    await this.dataSource.transaction(async (manager) => {
      const rate = await this.plateformeFinance.getCommissionRate(manager);
      for (const [commercantId, value] of grouped) {
        const commission = Math.round(value.montant * rate / 100);
        const existing = await manager.findOne(VenteRemise, { where: { venteId, commercantId } });
        if (!existing) await this.plateformeFinance.creditCommission(manager, commission);
        await manager.upsert(VenteRemise, {
          venteId, commercantId, montant: value.montant - commission, montantBrut: value.montant,
          commissionMontant: commission, commissionPourcentage: rate,
          articlesJson: JSON.stringify(value.articles), statut: 'bloquee', qrTokenHash: null, dateRemise: null,
        }, ['venteId', 'commercantId']);
      }
    });
  }

  async generateHandoverQr(merchantId: number, remiseId: number) {
    const remise = await this.remises.findOne({ where: { id: remiseId, commercantId: merchantId } });
    if (!remise) throw new NotFoundException('Commande vendeur introuvable.');
    if (remise.statut !== 'bloquee') throw new BadRequestException('Le QR est disponible uniquement pour une commande payée et non remise.');
    const token = randomBytes(32).toString('base64url');
    remise.qrTokenHash = createHash('sha256').update(token).digest('hex');
    await this.remises.save(remise);
    const qrContent = `ORION-HANDOVER:${token}`;
    return { content: qrContent, qrDataUrl: await QRCode.toDataURL(qrContent, { errorCorrectionLevel: 'M', margin: 2, width: 320 }), remiseId: remise.id, venteId: remise.venteId, montant: remise.montant };
  }

  async confirmHandover(clientId: number, content: string, expectedVenteId?: number) {
    const token = content?.trim().replace(/^ORION-HANDOVER:/, '');
    if (!token || token.length < 32 || token.length > 128) throw new BadRequestException('QR de remise invalide.');
    const hash = createHash('sha256').update(token).digest('hex');
    const remise = await this.remises.findOne({ where: { qrTokenHash: hash } });
    if (!remise) throw new NotFoundException('QR inconnu ou déjà utilisé.');
    const result = await this.dataSource.transaction(async (manager) => {
      const sale = await manager.findOne(Vente, { where: { id: remise.venteId } });
      if (!sale || sale.utilisateurId !== clientId) throw new ForbiddenException('Cette remise ne correspond pas à votre compte client.');
      if (expectedVenteId && sale.id !== expectedVenteId) throw new BadRequestException('Ce QR concerne une autre commande.');
      if (sale.statut !== 'payee') throw new BadRequestException('Cette commande n’est pas confirmée comme payée.');
      const result = await manager.update(VenteRemise, { id: remise.id, statut: 'bloquee', qrTokenHash: hash }, { statut: 'liberee', qrTokenHash: null, dateRemise: new Date() });
      if (!result.affected) throw new BadRequestException('Ce QR a déjà été utilisé ou renouvelé.');
      return { ok: true, remiseId: remise.id, venteId: remise.venteId, montant: remise.montant, statut: 'liberee' };
    });
    await this.notificationService.notifyHandoverConfirmed(remise.venteId, clientId, remise.commercantId, remise.montant);
    return result;
  }

  // GET ONE
  async findOne(id: number) {
    const vente = await this.repo.findOne({ where: { id } });

    if (!vente) {
      throw new NotFoundException(`Vente avec id ${id} introuvable`);
    }

    return vente;
  }

  // UPDATE
  async update(id: number, data: Partial<Vente>) {
    const vente = await this.findOne(id);

    Object.assign(vente, data);

    return await this.repo.save(vente);
  }

  // DELETE
  async remove(id: number) {
    const vente = await this.findOne(id);
    return await this.repo.remove(vente);
  }
}
