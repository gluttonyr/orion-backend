import { Body, Controller, Delete, ForbiddenException, Get, Headers, Param, Post, Put, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PanierService } from './panier.service';
import { Panier } from './panier.model';
import { Roles } from '../auth/roles.decorator';

@Controller('panier')
export class PanierController {
  constructor(private readonly panierService: PanierService, private readonly jwt: JwtService) {}

  private async getUserId(authorization?: string): Promise<number> {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Authentification requise.');
    try {
      const claims = await this.jwt.verifyAsync<{ sub: number }>(token);
      const userId = Number(claims.sub);
      if (!Number.isInteger(userId) || userId <= 0) throw new Error('Invalid user id');
      return userId;
    } catch {
      throw new UnauthorizedException('Session invalide ou expirée.');
    }
  }

  private async ownedPanier(id: number, userId: number) {
    const panier = await this.panierService.findOne(id);
    if (panier.utilisateurId !== userId) throw new ForbiddenException('Ce panier ne t’appartient pas.');
    return panier;
  }

  // CREATE
  @Post()
  async create(@Body() body: Partial<Panier>, @Headers('authorization') authorization: string) {
    return this.panierService.create({ ...body, utilisateurId: await this.getUserId(authorization) });
  }

  @Get('me')
  async getMyCart(@Headers('authorization') authorization: string) {
    return this.panierService.getCurrentCart(await this.getUserId(authorization));
  }

  @Put('me')
  async saveMyCart(@Body() body: { items?: unknown }, @Headers('authorization') authorization: string) {
    return this.panierService.saveCurrentCart(await this.getUserId(authorization), body?.items);
  }

  @Delete('me')
  async clearMyCart(@Headers('authorization') authorization: string) {
    return this.panierService.clearCurrentCart(await this.getUserId(authorization));
  }

  // GET ALL
  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.panierService.findAll();
  }

  // GET ONE
  @Get(':id')
  async findOne(@Param('id') id: string, @Headers('authorization') authorization: string) {
    return this.ownedPanier(Number(id), await this.getUserId(authorization));
  }

  // GET BY UTILISATEUR
  @Get('utilisateur/:utilisateurId')
  findByUtilisateur(@Param('utilisateurId') utilisateurId: string, @Headers('authorization') authorization: string) {
    const userId = this.getUserId(authorization);
    return userId.then((authenticatedId) => {
      if (authenticatedId !== Number(utilisateurId)) throw new ForbiddenException('Accès à ce panier refusé.');
      return this.panierService.findByUtilisateur(authenticatedId);
    });
  }

  // UPDATE
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Partial<Panier>, @Headers('authorization') authorization: string) {
    const userId = await this.getUserId(authorization);
    await this.ownedPanier(Number(id), userId);
    const { utilisateurId: _ignored, utilisateur: _ignoredUser, ...safeBody } = body;
    return this.panierService.update(Number(id), safeBody);
  }

  // DELETE
  @Delete(':id')
  async remove(@Param('id') id: string, @Headers('authorization') authorization: string) {
    await this.ownedPanier(Number(id), await this.getUserId(authorization));
    return this.panierService.remove(Number(id));
  }

  // CHECKOUT - Créer une vente à partir du panier
  @Post(':id/checkout')
  async checkout(@Param('id') id: string, @Headers('authorization') authorization: string) {
    // Logique pour créer une vente
    // Pour l'instant, juste marquer le panier comme commandé
    const panier = await this.ownedPanier(Number(id), await this.getUserId(authorization));
    panier.statut = 'commande';
    return this.panierService.update(Number(id), panier);
  }
}
