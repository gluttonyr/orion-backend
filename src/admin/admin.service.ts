import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteSettings } from './site-settings.model';
import { Utilisateur } from '../utilisateur/utilisateur.model';
import { Vente } from '../vente/vente.model';
import { PortefeuillePlateforme } from '../plateforme/portefeuille-plateforme.model';

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    @InjectRepository(SiteSettings) private readonly settingsRepo: Repository<SiteSettings>,
    @InjectRepository(Utilisateur) private readonly usersRepo: Repository<Utilisateur>,
    @InjectRepository(Vente) private readonly salesRepo: Repository<Vente>,
    @InjectRepository(PortefeuillePlateforme) private readonly walletRepo: Repository<PortefeuillePlateforme>,
  ) {}

  async onModuleInit() {
    if (!await this.settingsRepo.findOne({ where: { id: 1 } })) {
      await this.settingsRepo.save({ id: 1, heroImagesJson: '[]', carouselImagesJson: '[]' });
    }
  }

  async getUsers() {
    const users = await this.usersRepo.find({ order: { id: 'DESC' } });
    return users.map(({ password: _password, ...user }) => user);
  }

  getOrders() {
    return this.salesRepo.find({
      relations: ['produits', 'utilisateur'],
      order: { date_achat: 'DESC' },
    });
  }

  async getPlatformWallet() {
    return (await this.walletRepo.findOne({ where: { id: 1 } })) ?? {
      id: 1, solde: 0, totalCommissions: 0, totalRemboursements: 0, updatedAt: null,
    };
  }

  async getSiteSettings() {
    const settings = await this.ensureSettings();
    return {
      heroImages: this.decode(settings.heroImagesJson),
      carouselImages: this.decode(settings.carouselImagesJson),
      updatedAt: settings.updatedAt,
    };
  }

  async updateSiteSettings(
    input: { heroImages?: string; carouselImages?: string },
    files: { heroImagesFiles?: Express.Multer.File[]; carouselImagesFiles?: Express.Multer.File[] },
  ) {
    const settings = await this.ensureSettings();
    const heroFiles = files.heroImagesFiles ?? [];
    const carouselFiles = files.carouselImagesFiles ?? [];
    if (heroFiles.length > 0 && heroFiles.length !== 3) throw new Error('Sélectionnez exactement trois images pour l’en-tête.');
    const heroImages = heroFiles.length ? heroFiles.map((file) => file.filename) : this.parseInput(input.heroImages, this.decode(settings.heroImagesJson));
    const carouselImages = carouselFiles.length ? carouselFiles.map((file) => file.filename) : this.parseInput(input.carouselImages, this.decode(settings.carouselImagesJson));
    if (heroImages.length > 3) throw new Error('La page d’accueil accepte au maximum trois images d’en-tête.');
    if (carouselImages.length > 10) throw new Error('Le carrousel accepte au maximum dix images.');
    settings.heroImagesJson = JSON.stringify(heroImages);
    settings.carouselImagesJson = JSON.stringify(carouselImages);
    await this.settingsRepo.save(settings);
    return this.getSiteSettings();
  }

  private async ensureSettings() {
    let settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (!settings) settings = await this.settingsRepo.save({ id: 1, heroImagesJson: '[]', carouselImagesJson: '[]' });
    return settings;
  }

  private decode(value: string): string[] {
    try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : []; }
    catch { return []; }
  }

  private parseInput(value: string | undefined, fallback: string[]) {
    if (!value) return fallback;
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : fallback;
    } catch { return fallback; }
  }
}
