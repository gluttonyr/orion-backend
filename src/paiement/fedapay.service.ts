import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { Webhook } from 'fedapay';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { Produit } from '../produit/produit.model';
import { ProduitService } from '../produit/produit.service';
import { Transaction, TransactionStatus } from '../transaction/transaction.model';
import { TransactionService } from '../transaction/transaction.service';
import { VenteService } from '../vente/vente.service';
import { LiveSessionService } from '../live/live-session.service';
import { Vente } from '../vente/vente.model';
import { UtilisateurService } from '../utilisateur/utilisateur.service';
import { MissionService } from '../mission/mission.service';
import { Mission, StatutMission } from '../mission/mission.model';
import { TransactionPurpose } from '../transaction/transaction.model';

export interface FedaPayCheckoutDto {
  produitIds: number[];
  quantites: number[];
  liveSessionId?: number;
  platform?: 'web' | 'mobile';
}

type FedaPayResource = Record<string, unknown>;

@Injectable()
export class FedaPayService {
  constructor(
    private readonly config: ConfigService,
    private readonly venteService: VenteService,
    private readonly produitService: ProduitService,
    private readonly transactionService: TransactionService,
    private readonly liveSessionService: LiveSessionService,
    private readonly utilisateurService: UtilisateurService,
    private readonly missionService: MissionService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  private get apiKey() {
    const key = this.config.get<string>('FEDAPAY_SECRET_KEY');
    if (!key) {
      throw new ServiceUnavailableException('FedaPay n’est pas configuré : FEDAPAY_SECRET_KEY manque dans .env');
    }
    return key;
  }

  private get apiBaseUrl() {
    const environment = this.config.get<string>('FEDAPAY_ENVIRONMENT') ?? 'live';
    if (environment !== 'sandbox' && environment !== 'live') {
      throw new ServiceUnavailableException('FEDAPAY_ENVIRONMENT doit valoir sandbox ou live');
    }
    return environment === 'live' ? 'https://api.fedapay.com/v1' : 'https://sandbox-api.fedapay.com/v1';
  }

  private unwrap(payload: FedaPayResource, resourceName: string): FedaPayResource {
    const wrapped = payload[`v1/${resourceName}`] ?? payload.data ?? payload;
    if (Array.isArray(wrapped)) {
      const [resource] = wrapped;
      if (resource && typeof resource === 'object') return resource as FedaPayResource;
    }
    if (wrapped && typeof wrapped === 'object') return wrapped as FedaPayResource;
    throw new BadGatewayException('Réponse FedaPay illisible');
  }

  private async request(path: string, init: RequestInit = {}): Promise<FedaPayResource> {
    let response: Response;
    try {
      response = await fetch(`${this.apiBaseUrl}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...init.headers,
        },
      });
    } catch {
      throw new BadGatewayException('FedaPay est momentanément inaccessible');
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new BadGatewayException('FedaPay a retourné une réponse invalide');
    }
    if (!response.ok) {
      const detail = payload && typeof payload === 'object'
        ? (payload as { message?: string; error?: string }).message ??
          (payload as { error?: string }).error
        : undefined;
      throw new BadGatewayException(detail || `FedaPay a refusé la requête (${response.status})`);
    }
    if (!payload || typeof payload !== 'object') {
      throw new BadGatewayException('FedaPay a retourné une réponse invalide');
    }
    return payload as FedaPayResource;
  }

  async initPayment(input: FedaPayCheckoutDto, utilisateurId: number) {
    if (
      !input ||
      !Array.isArray(input.produitIds) ||
      input.produitIds.length === 0 ||
      input.produitIds.length !== input.quantites?.length ||
      input.produitIds.some((id) => !Number.isSafeInteger(Number(id)) || Number(id) <= 0) ||
      input.quantites.some((quantity) => !Number.isSafeInteger(Number(quantity)) || Number(quantity) <= 0)
    ) {
      throw new BadRequestException('Les produits et quantités de la commande sont invalides');
    }
    if (new Set(input.produitIds.map(Number)).size !== input.produitIds.length) {
      throw new BadRequestException('Un même produit ne peut apparaître qu’une fois dans la commande');
    }
    if (input.platform !== undefined && input.platform !== 'web' && input.platform !== 'mobile') {
      throw new BadRequestException('Le canal de paiement indiqué est invalide');
    }
    const customer = await this.utilisateurService.findOne(utilisateurId);
    if (!customer.prenom?.trim() || !customer.nom?.trim() || !customer.email?.trim() || !customer.adresse?.trim()) {
      throw new BadRequestException('Complète ton prénom, ton nom, ton e-mail et ton adresse dans ton profil avant de commander');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) {
      throw new BadRequestException('L’adresse e-mail enregistrée dans le profil est invalide');
    }
    const appBaseUrl = this.config.get<string>('APP_BASE_URL');
    if (!appBaseUrl) {
      throw new ServiceUnavailableException('APP_BASE_URL doit être configuré pour les paiements FedaPay');
    }
    if (!this.config.get<string>('FEDAPAY_SECRET_KEY')) {
      throw new ServiceUnavailableException('FedaPay n’est pas configuré : FEDAPAY_SECRET_KEY manque dans .env');
    }
    const environment = this.config.get<string>('FEDAPAY_ENVIRONMENT') ?? 'live';
    if (environment !== 'sandbox' && environment !== 'live') {
      throw new ServiceUnavailableException('FEDAPAY_ENVIRONMENT doit valoir sandbox ou live');
    }
    try {
      const callbackOrigin = new URL(appBaseUrl);
      if (callbackOrigin.protocol !== 'http:' && callbackOrigin.protocol !== 'https:') throw new Error('Invalid callback protocol');
    } catch {
      throw new ServiceUnavailableException('APP_BASE_URL doit être une URL HTTP ou HTTPS valide');
    }

    const products = await Promise.all(input.produitIds.map((id) => this.produitService.findOne(Number(id))));
    if (products.some((product, index) => input.quantites[index] > product.stock)) {
      throw new BadRequestException('Le stock est insuffisant pour un ou plusieurs produits');
    }
    let liveSessionId: number | null = null;
    if (input.liveSessionId !== undefined) {
      if (!Number.isInteger(Number(input.liveSessionId)) || Number(input.liveSessionId) <= 0) {
        throw new BadRequestException('La session Live indiquée est invalide');
      }
      const session = await this.liveSessionService.findAttributableSession(
        Number(input.liveSessionId),
        products.map((product) => product.id),
      );
      if (session) liveSessionId = session.id;
    }

    const total = products.reduce(
      (sum, product, index) => sum + Number(product.prix) * Number(input.quantites[index]),
      0,
    );
    if (!Number.isSafeInteger(total) || total <= 0) {
      throw new BadRequestException('Le total de la commande doit être un montant XOF entier et positif');
    }
    const sale = await this.venteService.create({
      utilisateurId: customer.id,
      clientPrenom: customer.prenom.trim(),
      clientNom: customer.nom.trim(),
      clientEmail: customer.email.trim().toLowerCase(),
      clientTelephone: customer.contact?.trim() || null,
      adresseLivraison: customer.adresse.trim(),
      produits: products,
      quantites: input.quantites.map(Number),
      date_achat: new Date(),
      prix_total: total,
      statut: 'en_attente',
      liveSessionId,
    });

    const reference = `ORION-${randomUUID().replace(/-/g, '')}`;
    let localTransaction: Transaction;
    try {
      localTransaction = await this.transactionService.create({
        reference,
        amount: total,
        venteId: sale.id,
        methode: 'FedaPay',
        description: `Paiement commande #${sale.id}`,
        stockReserved: false,
      });
    } catch (error) {
      await this.dataSource.getRepository(Vente).update(sale.id, { statut: 'echouee' });
      throw error;
    }
    try {
      await this.dataSource.transaction(async (manager) => {
        await this.reserveSaleStockInManager(manager, products, input.quantites.map(Number));
        await manager.update(Transaction, localTransaction.id, { stockReserved: true });
      });
      localTransaction.stockReserved = true;
    } catch (error) {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(Transaction, localTransaction.id, { status: TransactionStatus.FAILED });
        await manager.update(Vente, sale.id, { statut: 'echouee' });
      });
      throw error;
    }

    let providerTransaction: FedaPayResource;
    try {
      const rawTransaction = await this.request('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          description: `Commande Orion #${sale.id}`,
          amount: total,
          currency: { iso: 'XOF' },
          callback_url: `${appBaseUrl.replace(/\/$/, '')}/checkout?fedapay_reference=${encodeURIComponent(reference)}${input.platform === 'mobile' ? '&orion_mobile=1' : ''}`,
          custom_metadata: { orion_reference: reference, orion_sale_id: sale.id },
          customer: {
            firstname: customer.prenom.trim(),
            lastname: customer.nom.trim(),
            email: customer.email.trim().toLowerCase(),
            ...(customer.contact
              ? {
                  phone_number: {
                    number: customer.contact.replace(/\D/g, ''),
                    country: this.config.get<string>('FEDAPAY_COUNTRY') ?? 'TG',
                  },
                }
              : {}),
          },
        }),
      });
      providerTransaction = this.unwrap(rawTransaction, 'transaction');
    } catch (error) {
      await this.failAndReleaseStock(localTransaction.id, sale.id);
      throw error;
    }

    const providerId = providerTransaction.id;
    if (providerId === undefined || providerId === null) {
      await this.failAndReleaseStock(localTransaction.id, sale.id);
      throw new BadGatewayException('FedaPay n’a pas retourné l’identifiant du paiement');
    }
    try {
      await this.transactionService.attachProviderTransactionId(localTransaction.id, String(providerId));
      const rawToken = await this.request(`/transactions/${encodeURIComponent(String(providerId))}/token`, {
        method: 'POST',
      });
      const token = this.unwrap(rawToken, 'token');
      const paymentUrl = token.url;
      if (typeof paymentUrl !== 'string' || !/^https:\/\//i.test(paymentUrl)) {
        throw new BadGatewayException('FedaPay n’a pas retourné de lien de paiement valide');
      }
      return { payment_url: paymentUrl, reference, venteId: sale.id };
    } catch (error) {
      await this.failAndReleaseStock(localTransaction.id, sale.id);
      throw error;
    }
  }

  async initMissionPublicationPayment(missionId: number, merchantId: number, platform?: 'web' | 'mobile') {
    if (!Number.isSafeInteger(missionId) || missionId <= 0) throw new BadRequestException('Mission invalide');
    if (platform !== undefined && platform !== 'web' && platform !== 'mobile') throw new BadRequestException('Canal de paiement invalide');
    const mission = await this.missionService.getMissionForPublication(missionId, merchantId);
    const pending = await this.dataSource.getRepository(Transaction).findOne({
      where: { missionId, purpose: TransactionPurpose.MISSION_PUBLICATION, status: TransactionStatus.PENDING },
      relations: ['mission'],
    });
    if (pending?.providerTransactionId) {
      const rawToken = await this.request(`/transactions/${encodeURIComponent(pending.providerTransactionId)}/token`, { method: 'POST' });
      const token = this.unwrap(rawToken, 'token');
      if (typeof token.url === 'string' && /^https:\/\//i.test(token.url)) return { payment_url: token.url, reference: pending.reference, missionId };
    }

    const merchant = await this.utilisateurService.findOne(merchantId);
    if (!merchant.prenom?.trim() || !merchant.nom?.trim() || !merchant.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(merchant.email.trim())) {
      throw new BadRequestException('Complète ton prénom, ton nom et ton e-mail dans ton profil avant de payer la publication');
    }
    const appBaseUrl = this.config.get<string>('APP_BASE_URL');
    if (!appBaseUrl) throw new ServiceUnavailableException('APP_BASE_URL doit être configuré pour les paiements FedaPay');
    try {
      const callbackOrigin = new URL(appBaseUrl);
      if (callbackOrigin.protocol !== 'http:' && callbackOrigin.protocol !== 'https:') throw new Error('Invalid callback protocol');
    } catch {
      throw new ServiceUnavailableException('APP_BASE_URL doit être une URL HTTP ou HTTPS valide');
    }
    const reference = `ORION-MISSION-${randomUUID().replace(/-/g, '')}`;
    const transaction = await this.transactionService.create({
      reference, amount: 500, missionId, purpose: TransactionPurpose.MISSION_PUBLICATION,
      methode: 'FedaPay', description: `Frais de publication mission #${mission.id}`, stockReserved: false,
    });
    try {
      const rawPayment = await this.request('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          description: `Publication de mission Orion #${mission.id}`,
          amount: 500,
          currency: { iso: 'XOF' },
          callback_url: `${appBaseUrl.replace(/\/$/, '')}/checkout?purpose=mission&fedapay_reference=${encodeURIComponent(reference)}${platform === 'mobile' ? '&orion_mobile=1' : ''}`,
          custom_metadata: { orion_reference: reference, orion_mission_id: mission.id, purpose: 'mission_publication' },
          customer: {
            firstname: merchant.prenom.trim(), lastname: merchant.nom.trim(), email: merchant.email.trim().toLowerCase(),
            ...(merchant.contact ? { phone_number: { number: merchant.contact.replace(/\D/g, ''), country: this.config.get<string>('FEDAPAY_COUNTRY') ?? 'TG' } } : {}),
          },
        }),
      });
      const providerPayment = this.unwrap(rawPayment, 'transaction');
      if (providerPayment.id === undefined || providerPayment.id === null) throw new BadGatewayException('FedaPay n’a pas retourné l’identifiant du paiement');
      await this.transactionService.attachProviderTransactionId(transaction.id, String(providerPayment.id));
      const rawToken = await this.request(`/transactions/${encodeURIComponent(String(providerPayment.id))}/token`, { method: 'POST' });
      const token = this.unwrap(rawToken, 'token');
      if (typeof token.url !== 'string' || !/^https:\/\//i.test(token.url)) throw new BadGatewayException('FedaPay n’a pas retourné de lien de paiement valide');
      return { payment_url: token.url, reference, missionId };
    } catch (error) {
      await this.dataSource.getRepository(Transaction).update(transaction.id, { status: TransactionStatus.FAILED });
      throw error;
    }
  }

  async handleWebhook(payload: Buffer, signature: string | undefined) {
    const secret = this.config.get<string>('FEDAPAY_WEBHOOK_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException('FEDAPAY_WEBHOOK_SECRET doit être configuré');
    }
    if (!signature) throw new UnauthorizedException('Signature FedaPay manquante');

    let event: FedaPayResource;
    try {
      event = Webhook.constructEvent(payload, signature, secret) as FedaPayResource;
    } catch {
      throw new UnauthorizedException('Signature FedaPay invalide');
    }
    const eventData = event.data && typeof event.data === 'object'
      ? event.data as FedaPayResource
      : {};
    const eventObject = event.object && typeof event.object === 'object'
      ? event.object as FedaPayResource
      : {};
    const dataObject = eventData.object && typeof eventData.object === 'object'
      ? eventData.object as FedaPayResource
      : {};
    const eventName = String(event.name ?? event.type ?? '').toLowerCase();
    if (eventName && !eventName.startsWith('transaction.')) {
      return { received: true, processed: false };
    }
    if (eventName === 'transaction.created') {
      return { received: true, processed: false };
    }
    const providerId = eventObject.id ?? dataObject.id ?? eventData.id;
    if (providerId === undefined || providerId === null) {
      throw new BadRequestException('Identifiant de transaction absent du webhook FedaPay');
    }
    await this.confirmPaymentByProviderId(String(providerId));
    return { received: true };
  }

  async check(reference: string) {
    const transaction = await this.transactionService.findByReference(reference);
    if (transaction.methode !== 'FedaPay' || !transaction.providerTransactionId) {
      throw new BadRequestException('Cette référence ne correspond pas à un paiement FedaPay');
    }
    return this.confirmPayment(transaction);
  }

  private async confirmPaymentByProviderId(providerId: string) {
    const transaction = await this.transactionService.findByProviderTransactionId(providerId);
    return this.confirmPayment(transaction);
  }

  private async confirmPayment(transaction: Transaction) {
    if (
      transaction.status !== TransactionStatus.PENDING &&
      !(transaction.status === TransactionStatus.SUCCESS && transaction.stockReserved === false)
    ) return transaction;
    const providerTransactionId = transaction.providerTransactionId;
    if (!providerTransactionId) {
      throw new BadRequestException('Identifiant fournisseur absent de la transaction');
    }
    const raw = await this.request(`/transactions/${encodeURIComponent(providerTransactionId)}`);
    const payment = this.unwrap(raw, 'transaction');
    if (payment.id !== undefined && String(payment.id) !== providerTransactionId) {
      throw new BadGatewayException('L’identifiant confirmé par FedaPay ne correspond pas à la transaction Orion');
    }
    if (Number(payment.amount) !== transaction.amount) {
      throw new BadGatewayException('Le montant confirmé par FedaPay ne correspond pas à la commande Orion');
    }
    const currency = payment.currency && typeof payment.currency === 'object'
      ? (payment.currency as FedaPayResource).iso
      : undefined;
    if (String(currency ?? '').toUpperCase() !== 'XOF') {
      throw new BadGatewayException('La devise confirmée par FedaPay ne correspond pas à la commande Orion');
    }
    const status = String(payment.status ?? '').toLowerCase();
    if (transaction.purpose === TransactionPurpose.MISSION_PUBLICATION) {
      if (!transaction.missionId) throw new BadRequestException('Mission associée absente de la transaction');
      if (status === 'approved' || status === 'transferred') {
        return this.dataSource.transaction(async (manager) => {
          const claim = await manager.update(Transaction, { id: transaction.id, status: TransactionStatus.PENDING }, { status: TransactionStatus.SUCCESS });
          if (claim.affected) await manager.update(Mission, { id: transaction.missionId, publicationPayee: false }, { publicationPayee: true, statut: StatutMission.OUVERTE, datePublication: new Date() });
          const saved = await manager.findOne(Transaction, { where: { id: transaction.id }, relations: ['mission'] });
          if (!saved) throw new BadRequestException('Transaction de publication introuvable');
          return saved;
        });
      }
      if (status === 'refunded') {
        return this.dataSource.transaction(async (manager) => {
          const claim = await manager.update(Transaction, { id: transaction.id, status: TransactionStatus.SUCCESS }, { status: TransactionStatus.REFUNDED });
          if (claim.affected) await manager.update(Mission, { id: transaction.missionId, publicationPayee: true }, { publicationPayee: false, statut: StatutMission.BROUILLON });
          return (await manager.findOne(Transaction, { where: { id: transaction.id }, relations: ['mission'] })) ?? transaction;
        });
      }
      if (status === 'canceled' || status === 'cancelled' || status === 'declined') {
        await this.dataSource.getRepository(Transaction).update({ id: transaction.id, status: TransactionStatus.PENDING }, { status: TransactionStatus.FAILED });
        return (await this.dataSource.getRepository(Transaction).findOne({ where: { id: transaction.id }, relations: ['mission'] })) ?? transaction;
      }
      return transaction;
    }
    if (!transaction.venteId) throw new BadRequestException('Commande absente de la transaction');
    if (!transaction.vente) throw new BadRequestException('Détails de commande absents de la transaction');
    const sale = transaction.vente;
    if (status === 'refunded') {
      return this.dataSource.transaction(async (manager) => {
        if (transaction.status === TransactionStatus.SUCCESS) {
          await manager.update(Transaction, { id: transaction.id, status: TransactionStatus.SUCCESS }, { status: TransactionStatus.REFUNDED });
          await manager.update(Vente, transaction.venteId, { statut: 'remboursee' });
        } else if (transaction.status === TransactionStatus.PENDING) {
          const claim = await manager.update(
            Transaction,
            { id: transaction.id, status: TransactionStatus.PENDING },
            { status: TransactionStatus.REFUNDED, stockReserved: false },
          );
          if (claim.affected && transaction.stockReserved) await this.restoreSaleStock(manager, transaction);
          await manager.update(Vente, transaction.venteId, { statut: 'remboursee' });
        }
        const saved = await manager.findOne(Transaction, {
          where: { id: transaction.id },
          relations: ['vente', 'vente.produits'],
        });
        if (!saved) throw new BadRequestException('Transaction locale introuvable après remboursement FedaPay');
        return saved;
      });
    }
    if (status === 'approved' || status === 'transferred') {
      return this.dataSource.transaction(async (manager) => {
        if (!transaction.stockReserved) {
          await this.reserveSaleStockInManager(manager, sale.produits, sale.quantites);
        }
        const claim = await manager.update(
          Transaction,
          { id: transaction.id, status: TransactionStatus.PENDING },
          { status: TransactionStatus.SUCCESS, stockReserved: false },
        );
        if (!claim.affected) {
          const saved = await manager.findOne(Transaction, {
            where: { id: transaction.id },
            relations: ['vente', 'vente.produits'],
          });
          if (!saved) throw new BadRequestException('Transaction locale introuvable après confirmation FedaPay');
          return saved;
        }
        await manager.update(Vente, transaction.venteId, { statut: 'payee' });
        const saved = await manager.findOne(Transaction, {
          where: { id: transaction.id },
          relations: ['vente', 'vente.produits'],
        });
        if (!saved) throw new BadRequestException('Transaction locale introuvable après confirmation FedaPay');
        return saved;
      });
    }
    if (status === 'canceled' || status === 'cancelled' || status === 'declined') {
      return this.dataSource.transaction(async (manager) => {
        const claim = await manager.update(
          Transaction,
          { id: transaction.id, status: TransactionStatus.PENDING },
          { status: TransactionStatus.FAILED, stockReserved: false },
        );
        if (claim.affected) {
          if (transaction.stockReserved) await this.restoreSaleStock(manager, transaction);
          await manager.update(Vente, transaction.venteId, { statut: 'echouee' });
        }
        const saved = await manager.findOne(Transaction, {
          where: { id: transaction.id },
          relations: ['vente', 'vente.produits'],
        });
        if (!saved) throw new BadRequestException('Transaction locale introuvable après confirmation FedaPay');
        return saved;
      });
    }
    return transaction;
  }

  private async reserveSaleStockInManager(manager: EntityManager, products: Produit[], quantities: number[]) {
    for (let index = 0; index < products.length; index++) {
      const product = products[index];
      const quantity = Number(quantities[index] ?? 1);
      const result = await manager
        .createQueryBuilder()
        .update(Produit)
        .set({ stock: () => `stock - ${quantity}` })
        .where('id = :id AND stock >= :quantity', { id: product.id, quantity })
        .execute();
      if (!result.affected) {
        throw new BadRequestException(`Stock insuffisant pour le produit « ${product.nom} »`);
      }
    }
  }

  private async restoreSaleStock(manager: EntityManager, transaction: Transaction) {
    const sale = await manager.findOne(Vente, {
      where: { id: transaction.venteId },
      relations: ['produits'],
    });
    if (!sale) throw new BadRequestException('Commande introuvable pendant la libération du stock');
    for (let index = 0; index < sale.produits.length; index++) {
      const product = sale.produits[index];
      const quantity = Number(sale.quantites[index] ?? 1);
      await manager
        .createQueryBuilder()
        .update(Produit)
        .set({ stock: () => `stock + ${quantity}` })
        .where('id = :id', { id: product.id })
        .execute();
    }
  }

  private async failAndReleaseStock(transactionId: number, saleId: number) {
    await this.dataSource.transaction(async (manager) => {
      const transaction = await manager.findOne(Transaction, { where: { id: transactionId } });
      if (transaction?.status === TransactionStatus.PENDING && transaction.stockReserved) {
        const claim = await manager.update(
          Transaction,
          { id: transactionId, status: TransactionStatus.PENDING, stockReserved: true },
          { status: TransactionStatus.FAILED, stockReserved: false },
        );
        if (claim.affected) await this.restoreSaleStock(manager, transaction);
      } else {
        await manager.update(Transaction, transactionId, { status: TransactionStatus.FAILED });
      }
      await manager.update(Vente, saleId, { statut: 'echouee' });
    });
  }
}
