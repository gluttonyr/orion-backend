import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { DemandeService } from './demande.service';
import { Demande } from './demande.model';
import { CurrentUser, type CurrentUserClaims } from '../auth/current-user.decorator';

const ADMIN_STATUSES = ['en_attente', 'acceptee', 'refusee', 'traitee'];

@Controller('demande')
export class DemandeController {
  constructor(private readonly demandeService: DemandeService) {}

  private async owned(id: number, user: CurrentUserClaims) {
    const demande = await this.demandeService.findOne(id);
    if (user.role !== 'ADMIN' && demande.utilisateurId !== user.id) throw new ForbiddenException('Cette demande ne vous appartient pas.');
    return demande;
  }

  @Post()
  create(@Body() body: Partial<Demande>, @CurrentUser() user: CurrentUserClaims) {
    const type = typeof body?.type === 'string' ? body.type.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    if (!type || !description) throw new BadRequestException('Le type et la description sont obligatoires.');
    return this.demandeService.create({ type, description, utilisateurId: user.id, statut: 'en_attente', date_envoi: new Date() });
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserClaims) {
    return user.role === 'ADMIN' ? this.demandeService.findAll() : this.demandeService.findByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserClaims) {
    return this.owned(id, user);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: Partial<Demande>, @CurrentUser() user: CurrentUserClaims) {
    await this.owned(id, user);
    const changes: Partial<Demande> = {};
    if (user.role === 'ADMIN') {
      if (typeof body?.statut === 'string' && ADMIN_STATUSES.includes(body.statut)) changes.statut = body.statut;
    } else if (typeof body?.description === 'string' && body.description.trim()) {
      changes.description = body.description.trim();
    }
    return this.demandeService.update(id, changes);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserClaims) {
    await this.owned(id, user);
    return this.demandeService.remove(id);
  }
}
