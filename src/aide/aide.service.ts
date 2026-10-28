import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AideCategorie, AideQuestion } from './aide.model';

export type AideCategorieInput = { titre?: unknown; description?: unknown };
export type AideQuestionInput = { categorieId?: unknown; titre?: unknown; description?: unknown };

export function requiredText(value: unknown, label: string, max: number): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new BadRequestException(`${label} est obligatoire.`);
  if (text.length > max) throw new BadRequestException(`${label} ne doit pas dépasser ${max} caractères.`);
  return text;
}

function optionalText(value: unknown, label: string, max: number): string {
  if (value === undefined || value === null || value === '') return '';
  return requiredText(value, label, max);
}

@Injectable()
export class AideService {
  constructor(
    @InjectRepository(AideCategorie) private readonly categories: Repository<AideCategorie>,
    @InjectRepository(AideQuestion) private readonly questions: Repository<AideQuestion>,
  ) {}

  findAll() {
    return this.categories.find({ relations: { questions: true }, order: { id: 'ASC', questions: { id: 'ASC' } } });
  }

  createCategorie(input: AideCategorieInput) {
    return this.categories.save(this.categories.create({
      titre: requiredText(input.titre, 'Le titre', 150),
      description: optionalText(input.description, 'La description', 500),
    }));
  }

  async updateCategorie(id: number, input: AideCategorieInput) {
    const categorie = await this.findCategorie(id);
    categorie.titre = requiredText(input.titre, 'Le titre', 150);
    categorie.description = optionalText(input.description, 'La description', 500);
    return this.categories.save(categorie);
  }

  async removeCategorie(id: number) {
    await this.categories.remove(await this.findCategorie(id));
    return { success: true };
  }

  async createQuestion(input: AideQuestionInput) {
    const categorie = await this.findCategorie(Number(input.categorieId));
    return this.questions.save(this.questions.create({
      categorieId: categorie.id,
      titre: requiredText(input.titre, 'La question', 255),
      description: requiredText(input.description, 'La réponse', 5000),
    }));
  }

  async updateQuestion(id: number, input: AideQuestionInput) {
    const question = await this.questions.findOne({ where: { id } });
    if (!question) throw new NotFoundException('Question d’aide introuvable.');
    question.titre = requiredText(input.titre, 'La question', 255);
    question.description = requiredText(input.description, 'La réponse', 5000);
    return this.questions.save(question);
  }

  async removeQuestion(id: number) {
    const question = await this.questions.findOne({ where: { id } });
    if (!question) throw new NotFoundException('Question d’aide introuvable.');
    await this.questions.remove(question);
    return { success: true };
  }

  private async findCategorie(id: number) {
    const categorie = Number.isSafeInteger(id) && id > 0 ? await this.categories.findOne({ where: { id } }) : null;
    if (!categorie) throw new NotFoundException('Catégorie d’aide introuvable.');
    return categorie;
  }
}
