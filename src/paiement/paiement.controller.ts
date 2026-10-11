import { Body, Controller, Get, Headers, HttpCode, InternalServerErrorException, Param, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { CinetpayService } from './cinetpay.service';
import { FedaPayService, type FedaPayCheckoutDto } from './fedapay.service';
import { TransactionService } from '../transaction/transaction.service';
import { TransactionStatus } from '../transaction/transaction.model';
import { UtilisateurService } from '../utilisateur/utilisateur.service';

@Controller('paiement')
export class PaiementController {
  constructor(
    private readonly cinetpayService: CinetpayService,
    private readonly fedapayService: FedaPayService,
    private readonly transactionService: TransactionService,
    private readonly utilisateurService: UtilisateurService,
  ) {}

  @Post('fedapay/init-payment')
  async initFedaPayPayment(
    @Body() body: FedaPayCheckoutDto,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Connecte-toi pour payer une commande');
    const user = await this.utilisateurService.findloggedUser(token);
    return this.fedapayService.initPayment(body, user.id);
  }

  @Post('fedapay/mission/:id/publication')
  async initMissionPublicationPayment(
    @Param('id') id: string,
    @Body() body: { platform?: 'web' | 'mobile' },
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Connecte-toi pour publier une mission');
    const user = await this.utilisateurService.findloggedUser(token);
    return this.fedapayService.initMissionPublicationPayment(Number(id), user.id, body?.platform);
  }

  @Post('fedapay/webhook')
  @HttpCode(200)
  fedapayWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-fedapay-signature') signature: string,
  ) {
    if (!request.rawBody) {
      throw new InternalServerErrorException('Nest rawBody support must be enabled to validate FedaPay webhooks');
    }
    return this.fedapayService.handleWebhook(request.rawBody, signature);
  }

  @Get('fedapay/check/:reference')
  checkFedaPay(@Param('reference') reference: string) {
    return this.fedapayService.check(reference);
  }

  // Webhook CinetPay (notify_url). Le nom exact des champs (merchant_transaction_id,
  // status, notify_token...) reste à confirmer avec la doc "Notification de
  // transaction" : on tente plusieurs noms plausibles en attendant.
  @Post('notify')
  @HttpCode(200)
  async notify(@Body() body: any) {
    console.log('Webhook CinetPay reçu:', body);

    const reference = body?.merchant_transaction_id || body?.cpm_trans_id || body?.transaction_id;
    if (!reference) {
      return { received: true };
    }

    try {
      const transaction = await this.transactionService.findByReference(reference);

      // Vérification défensive : si CinetPay renvoie le notify_token généré à
      // l'init, il doit correspondre à celui stocké pour cette transaction.
      const receivedToken = body?.notify_token || body?.token;
      if (transaction.notifyToken && receivedToken && receivedToken !== transaction.notifyToken) {
        console.error('notify_token invalide pour la transaction', reference);
        return { received: true };
      }

      // Le webhook ne sert que de déclencheur : confirmPayment revérifie
      // toujours le statut canonique auprès de CinetPay avant de trancher.
      await this.cinetpayService.confirmPayment(reference);
    } catch (e) {
      console.error('Erreur webhook CinetPay:', e);
    }

    return { received: true };
  }

  // Consultée par la page de retour (success_url/failed_url) côté frontend.
  // Ne se fie jamais à un statut transmis par le client : lit l'état réel en
  // base (posé par le webhook), avec une revérification CinetPay en secours
  // si le webhook n'est pas encore arrivé.
  @Get('check/:reference')
  async check(@Param('reference') reference: string) {
    const transaction = await this.transactionService.findByReference(reference);

    if (transaction.status === TransactionStatus.PENDING) {
      try {
        return await this.cinetpayService.confirmPayment(reference);
      } catch (e) {
        console.error('Vérification CinetPay indisponible:', e);
      }
    }

    return transaction;
  }
}
