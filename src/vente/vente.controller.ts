import { Body, Controller, Delete, ForbiddenException, Get, Headers, Param, Post, Put, Query, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { VenteService } from './vente.service';
import { Vente } from './vente.model';
import { CinetpayService, type InitPaymentDto } from '../paiement/cinetpay.service';
import { Roles } from '../auth/roles.decorator';

@Controller('vente')
export class VenteController {
  constructor(
    private readonly venteService: VenteService,
    private readonly cinetpayService: CinetpayService,
    private readonly jwt: JwtService,
  ) {}

  private async getSession(authorization?: string, role?: 'COMMERCANT' | 'UTILISATEUR' | 'ADMIN') {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Authentification requise.');
    let claims: { sub?: number; role?: string };
    try { claims = await this.jwt.verifyAsync(token); }
    catch { throw new UnauthorizedException('Session invalide ou expirée.'); }
    if (!claims.sub || (role && claims.role !== role)) throw new ForbiddenException('Accès non autorisé.');
    return Number(claims.sub);
  }

  // CREATE
  @Post()
  async create(@Body() body: Partial<Vente>) {
    return this.venteService.create(body);
  }

  // Crée la vente pour les produits/quantités donnés et initialise le
  // paiement CinetPay correspondant. Retourne l'URL de paiement hébergée
  // par CinetPay vers laquelle le frontend doit rediriger l'utilisateur.
  @Post('init-payment')
  async initPayment(@Body() body: InitPaymentDto) {
    console.log('Requête init-payment reçue:', body);
    return this.cinetpayService.initPayment(body);
  }

  // GET ALL
  @Get('mes-achats')
  async findMyPurchases(@Headers('authorization') authorization: string) {
    const userId = await this.getSession(authorization);
    return this.venteService.findByUtilisateur(userId);
  }

  @Get('seller/analytics')
  @Roles('COMMERCANT')
  async getSellerAnalytics(
    @Headers('authorization') authorization: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.venteService.getMerchantAnalytics(await this.getSession(authorization, 'COMMERCANT'), from, to);
  }

  @Get('seller/wallet')
  @Roles('COMMERCANT')
  async getSellerWallet(@Headers('authorization') authorization: string) {
    return this.venteService.walletForMerchant(await this.getSession(authorization, 'COMMERCANT'));
  }

  @Get('seller/remises')
  @Roles('COMMERCANT')
  async getSellerOrders(@Headers('authorization') authorization: string) {
    return this.venteService.findMerchantSales(await this.getSession(authorization, 'COMMERCANT'));
  }

  @Post('seller/remises/:id/qr')
  @Roles('COMMERCANT')
  async generateHandoverQr(@Param('id') id: string, @Headers('authorization') authorization: string) {
    return this.venteService.generateHandoverQr(await this.getSession(authorization, 'COMMERCANT'), Number(id));
  }

  @Post('remise/confirm')
  async confirmHandover(@Body() body: { content?: string; venteId?: number }, @Headers('authorization') authorization: string) {
    return this.venteService.confirmHandover(await this.getSession(authorization), body?.content ?? '', Number(body?.venteId));
  }

  @Get()
  @Roles('ADMIN')
  async findAll(@Headers('authorization') authorization: string) {
    await this.getSession(authorization, 'ADMIN');
    return this.venteService.findAll();
  }

  // GET ONE
  @Get(':id')
  @Roles('ADMIN')
  async findOne(@Param('id') id: string) {
    return this.venteService.findOne(Number(id));
  }

  // UPDATE
  @Put(':id')
  @Roles('ADMIN')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<Vente>,
  ) {
    return this.venteService.update(Number(id), body);
  }

  // DELETE
  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    return this.venteService.remove(Number(id));
  }
}
export { Vente };

