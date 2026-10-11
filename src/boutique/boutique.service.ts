import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { BoutiqueRepository } from './boutique.repository';
import { Boutique } from './boutique.model';
import { JwtService } from '@nestjs/jwt';
import { PlanService } from '../plan/plan.service';

@Injectable()
export class BoutiqueService {
  constructor(private readonly boutiqueRepository: BoutiqueRepository, private readonly jwt: JwtService, private readonly plans: PlanService) {}

  private async getOwnerId(token?: string): Promise<number> {
    if (!token) throw new UnauthorizedException('Authentification requise');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number; role?: string }>(token);
      if (payload.role !== 'COMMERCANT') throw new UnauthorizedException('Un compte commerçant est requis');
      return Number(payload.sub);
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }

  async create(data: Partial<Boutique>, token?: string) {
    const proprietaireId = await this.getOwnerId(token);
    await this.plans.assertCanCreateStore(proprietaireId);
    const count = await this.boutiqueRepository.countBoutiquesByOwner(proprietaireId);
    if (count >= 1) throw new BadRequestException('Un compte commerçant ne peut créer qu’une seule boutique.');
    data.dateCreation = new Date(); // auto date
    data.proprietaireId = proprietaireId;
    return this.boutiqueRepository.createBoutique(data);
  }

  async findMine(token?: string) {
    const proprietaireId = await this.getOwnerId(token);
    return this.boutiqueRepository.findBoutiquesByOwner(proprietaireId);
  }

  async findAll() {
    return this.boutiqueRepository.findAllBoutiques();
  }

  async findOne(id: number) {
    const boutique = await this.boutiqueRepository.findBoutiqueById(id);
    if (!boutique) {
      throw new NotFoundException('Boutique non trouvée');
    }
    return boutique;
  }

  async update(id: number, data: Partial<Boutique>) {
    const boutique = await this.findOne(id);
    return this.boutiqueRepository.updateBoutique(boutique.id, data);
  }

  async remove(id: number) {
    const boutique = await this.findOne(id);
    return this.boutiqueRepository.deleteBoutique(boutique.id);
  }
}
