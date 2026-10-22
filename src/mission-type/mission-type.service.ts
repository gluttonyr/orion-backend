import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MissionType } from './mission-type.model';

@Injectable()
export class MissionTypeService {
  constructor(@InjectRepository(MissionType) private readonly repository: Repository<MissionType>) {}

  findAll() {
    return this.repository.find({ order: { nom: 'ASC' } });
  }

  async findByName(nom: string) {
    return this.repository.findOne({ where: { nom: nom.trim() } });
  }

  async create(data: { nom?: string }) {
    const nom = data.nom?.trim();
    if (!nom) throw new BadRequestException('Le nom du type de mission est obligatoire.');
    try {
      return await this.repository.save(this.repository.create({ nom }));
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') throw new ConflictException('Ce type de mission existe déjà.');
      throw error;
    }
  }

  async update(id: number, data: { nom?: string }) {
    const missionType = await this.repository.findOne({ where: { id } });
    if (!missionType) throw new NotFoundException('Type de mission introuvable.');
    const nom = data.nom?.trim();
    if (!nom) throw new BadRequestException('Le nom du type de mission est obligatoire.');
    missionType.nom = nom;
    try {
      return await this.repository.save(missionType);
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') throw new ConflictException('Ce type de mission existe déjà.');
      throw error;
    }
  }

  async remove(id: number) {
    const missionType = await this.repository.findOne({ where: { id } });
    if (!missionType) throw new NotFoundException('Type de mission introuvable.');
    await this.repository.remove(missionType);
    return { success: true };
  }

  async assertExists(nom: string) {
    if (!await this.findByName(nom)) throw new BadRequestException('Choisissez un type de mission valide dans la liste.');
    return nom.trim();
  }
}
