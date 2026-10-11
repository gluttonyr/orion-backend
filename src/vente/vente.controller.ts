import { Body, Controller, Delete, Get, Headers, Param, Post, Put, UnauthorizedException } from '@nestjs/common';
import { VenteService } from './vente.service';
import { Vente } from './vente.model';
import { CinetpayService, type InitPaymentDto } from '../paiement/cinetpay.service';
import { UtilisateurService } from '../utilisateur/utilisateur.service';

@Controller('vente')
export class VenteController {
  constructor(
    private readonly venteService: VenteService,
    private readonly cinetpayService: CinetpayService,
    private readonly utilisateurService: UtilisateurService,
  ) {}

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
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Authentification requise pour consulter les achats');
    const user = await this.utilisateurService.findloggedUser(token);
    return this.venteService.findByUtilisateur(user.id);
  }

  @Get()
  async findAll() {
    return this.venteService.findAll();
  }

  // GET ONE
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.venteService.findOne(Number(id));
  }

  // UPDATE
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<Vente>,
  ) {
    return this.venteService.update(Number(id), body);
  }

  // DELETE
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.venteService.remove(Number(id));
  }
}
export { Vente };

