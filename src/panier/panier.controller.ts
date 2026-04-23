import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PanierService } from './panier.service';
import { Panier } from './panier.model';

@Controller('panier')
export class PanierController {
  constructor(private readonly panierService: PanierService) {}

  // CREATE
  @Post()
  async create(@Body() body: Partial<Panier>) {
    return this.panierService.create(body);
  }

  // GET ALL
  @Get()
  findAll() {
    return this.panierService.findAll();
  }

  // GET ONE
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.panierService.findOne(Number(id));
  }

  // GET BY UTILISATEUR
  @Get('utilisateur/:utilisateurId')
  findByUtilisateur(@Param('utilisateurId') utilisateurId: string) {
    return this.panierService.findByUtilisateur(Number(utilisateurId));
  }

  // UPDATE
  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<Panier>) {
    return this.panierService.update(Number(id), body);
  }

  // DELETE
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.panierService.remove(Number(id));
  }

  // CHECKOUT - Créer une vente à partir du panier
  @Post(':id/checkout')
  async checkout(@Param('id') id: string) {
    // Logique pour créer une vente
    // Pour l'instant, juste marquer le panier comme commandé
    const panier = await this.panierService.findOne(Number(id));
    panier.statut = 'commande';
    return this.panierService.update(Number(id), panier);
  }
}