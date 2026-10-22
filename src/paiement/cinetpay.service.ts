import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { VenteService } from '../vente/vente.service';
import { ProduitService } from '../produit/produit.service';
import { TransactionService } from '../transaction/transaction.service';
import { TransactionStatus } from '../transaction/transaction.model';
import { getProductSellingPrice } from '../produit/produit.model';
import { NotificationService } from '../notification/notification.service';

export interface InitPaymentDto {
  utilisateurId: number;
  produitIds: number[];
  quantites: number[];
  client: {
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
  };
  // chemin frontend vers lequel CinetPay redirige après paiement (ex: "/checkout" ou "/dashboard/checkout")
  returnPath?: string;
}

interface CinetpayInitResponse {
  code: number;
  status: string;
  merchant_transaction_id: string;
  notify_token: string;
  transaction_id: string;
  payment_token: string;
  payment_url: string;
  details?: { code: number; status: string; message: string; must_be_redirected: boolean };
}

@Injectable()
export class CinetpayService {
  // token d'accès mis en cache en mémoire (valide 24h côté CinetPay) pour
  // éviter de se réauthentifier à chaque appel
  private cachedToken: { accessToken: string; expiresAt: number } | null = null;

  constructor(
    private readonly venteService: VenteService,
    private readonly produitService: ProduitService,
    private readonly transactionService: TransactionService,
    private readonly config: ConfigService,
    private readonly notificationService: NotificationService,
  ) { }

  private getBaseUrl() {
    return this.config.get<string>('CINETPAY_BASE_URL') || 'https://api.cinetpay.net';
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.accessToken;
    }

    const apiKey = this.config.get<string>('CINETPAY_API_KEY');
    const apiPassword = this.config.get<string>('CINETPAY_API_PASSWORD');

    if (!apiKey || !apiPassword) {
      throw new BadRequestException(
        "CinetPay n'est pas configuré : CINETPAY_API_KEY / CINETPAY_API_PASSWORD manquants dans .env",
      );
    }

    const response = await fetch(`${this.getBaseUrl()}/v1/oauth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, api_password: apiPassword }),
    });
    

    const payload: any = await response.json();
    console.log('CinetPay auth response:', response.status, payload);
    if (payload.code !== 200 || !payload.access_token) {
      throw new BadRequestException(payload.status || 'Authentification CinetPay refusée');
    }

    // marge de sécurité de 60s avant l'expiration réelle du token
    this.cachedToken = {
      accessToken: payload.access_token,
      expiresAt: Date.now() + (payload.expires_in - 60) * 1000,
    };

    return this.cachedToken.accessToken;
  }

  private generateMerchantTransactionId() {
    // merchant_transaction_id est limité à 30 caractères côté CinetPay
    return ('ORION' + randomUUID().replace(/-/g, '')).slice(0, 30);
  }

  async initPayment(input: InitPaymentDto) {
    if (!input.produitIds?.length || input.produitIds.length !== input.quantites?.length) {
      throw new BadRequestException('produitIds et quantites doivent être des tableaux non vides de même longueur');
    }

    const produits = await Promise.all(input.produitIds.map((id) => this.produitService.findPublishedOne(id)));
    const unitPrices = produits.map(getProductSellingPrice);
    const totalPrice = unitPrices.reduce((sum, unitPrice, index) => sum + unitPrice * input.quantites[index], 0);

    const vente = await this.venteService.create({
      utilisateurId: input.utilisateurId,
      produits,
      quantites: input.quantites,
      prix_unitaires: unitPrices,
      date_achat: new Date(),
      prix_total: totalPrice,
      statut: 'en_attente',
    });
    console.log(`Vente #${vente.id} créée pour utilisateur #${input.utilisateurId} (montant: ${totalPrice} XOF)`);

    const accessToken = await this.getAccessToken();
    console.log('Token d’accès CinetPay obtenu:', accessToken.slice(0, 10) + '...');
    const merchantTransactionId = this.generateMerchantTransactionId();
    const returnPath = input.returnPath || '/checkout';
    const appBaseUrl = this.config.get<string>('APP_BASE_URL');
    const notifyUrl = `${this.config.get<string>('BACKEND_PUBLIC_URL')}/paiement/notify`;

    console.log(`Initialisation paiement CinetPay pour vente #${vente.id} (montant: ${totalPrice} XOF)`);
    const response = await fetch(`${this.getBaseUrl()}/v1/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        currency: 'XOF',
        merchant_transaction_id: merchantTransactionId,
        amount: totalPrice,
        lang: 'fr',
        designation: `Commande #${vente.id} - Orion`,
        client_email: input.client.email,
        client_phone_number: input.client.telephone,
        client_first_name: input.client.prenom,
        client_last_name: input.client.nom,
        direct_pay: false,
        success_url: `${appBaseUrl}${returnPath}?transaction_id=${merchantTransactionId}&status=success`,
        failed_url: `${appBaseUrl}${returnPath}?transaction_id=${merchantTransactionId}&status=failed`,
        notify_url: notifyUrl,
      }),
    });

    const payload: CinetpayInitResponse = await response.json();
    console.log('CinetPay init response:', response.status, JSON.stringify(payload, null, 2));

    if (payload.code !== 200 || !payload.payment_url) {
      throw new BadRequestException(payload.status || "Échec de l'initialisation du paiement CinetPay");
    }

    await this.transactionService.create({
      reference: merchantTransactionId,
      amount: totalPrice,
      venteId: vente.id,
      paymentToken: payload.payment_token,
      providerTransactionId: payload.transaction_id,
      notifyToken: payload.notify_token,
      description: `Paiement commande #${vente.id}`,
    });

    return { payment_url: payload.payment_url, transaction_id: merchantTransactionId };
  }

  async checkStatus(merchantTransactionId: string): Promise<any> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${this.getBaseUrl()}/v1/payment/${merchantTransactionId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return response.json();
  }

  // Appelée par le webhook (comme simple déclencheur) et par l'endpoint de
  // vérification manuelle. Conformément à la doc CinetPay : un webhook est
  // appelable par n'importe qui, on ne se fie donc JAMAIS à un statut transmis
  // dans son payload — on revérifie toujours le statut canonique via
  // GET /v1/payment/{merchant_transaction_id}.
  async confirmPayment(merchantTransactionId: string) {
    const transaction = await this.transactionService.findByReference(merchantTransactionId);

    if (transaction.status !== TransactionStatus.PENDING) {
      if (transaction.status === TransactionStatus.SUCCESS && transaction.vente) await this.notificationService.notifyOrderPaid(transaction.vente);
      if (transaction.status === TransactionStatus.REFUNDED && transaction.vente) await this.notificationService.notifyRefund(transaction.vente);
      return transaction;
    }
    if (!transaction.venteId || !transaction.vente) {
      throw new BadRequestException('Cette transaction CinetPay n’est pas associée à une commande.');
    }

    const check: any = await this.checkStatus(merchantTransactionId);
    const status = check?.status ?? check?.data?.status;
    const isSuccess = status === 'SUCCESS' || status === 'ACCEPTED';

    const saved = isSuccess
      ? await this.transactionService.markSuccess(transaction)
      : await this.transactionService.markFailed(transaction);

    await this.venteService.update(transaction.venteId, {
      statut: isSuccess ? 'payee' : 'echouee',
    });

    if (isSuccess) {
      // produits et quantites sont alignés par index sur la vente d'origine
      const vente = transaction.vente;
      await this.venteService.createPaidRemises(vente.id, vente.produits ?? [], vente.quantites ?? [], vente.prix_unitaires ?? undefined);
      for (let i = 0; i < vente.produits.length; i++) {
        const produit = vente.produits[i];
        const quantite = vente.quantites[i] ?? 1;
        await this.produitService.update(produit.id, { stock: Math.max(0, produit.stock - quantite) });
      }
      await this.notificationService.notifyOrderPaid(vente);
    }

    return saved;
  }
}
