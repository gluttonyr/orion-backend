import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { BoutiqueRepository } from './boutique.repository';
import { Boutique } from './boutique.model';
import { JwtService } from '@nestjs/jwt';
import { PlanService } from '../plan/plan.service';
import { BoutiqueCategorieService } from '../boutique-categorie/boutique-categorie.service';

@Injectable()
export class BoutiqueService {
  constructor(private readonly boutiqueRepository: BoutiqueRepository, private readonly jwt: JwtService, private readonly plans: PlanService, private readonly categories: BoutiqueCategorieService) {}

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
    if (!data.address?.trim()) throw new BadRequestException('L’adresse de la boutique est obligatoire.');
    await this.assertCategoryExists(data.category);
    const count = await this.boutiqueRepository.countBoutiquesByOwner(proprietaireId);
    if (count >= 1) throw new BadRequestException('Vous ne pouvez gérer qu’une boutique par compte.');
    await this.plans.assertCanCreateStore(proprietaireId);
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

  // Authentication is enforced by the global JWT guard; clients also use it for delivery addresses at checkout.
  async resolveMapsLocation(rawUrl: string): Promise<{ label: string | null }> {
    let current: URL;
    try { current = new URL(rawUrl); } catch { throw new BadRequestException('Lien Google Maps invalide.'); }
    const allowedHosts = new Set(['maps.app.goo.gl', 'goo.gl', 'www.google.com', 'google.com', 'maps.google.com']);
    const isAllowed = (url: URL) => url.protocol === 'https:' && allowedHosts.has(url.hostname.toLowerCase());
    if (!isAllowed(current)) throw new BadRequestException('Seuls les liens Google Maps sont acceptés.');

    let response: Response | undefined;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      response = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'OrionMarketplace/1.0 (Google Maps link name lookup)' } });
      const redirect = response.status >= 300 && response.status < 400 ? response.headers.get('location') : null;
      if (!redirect) break;
      current = new URL(redirect, current);
      if (!isAllowed(current)) throw new BadRequestException('La redirection du lien ne mène pas vers Google Maps.');
    }

    const labelFromUrl = this.mapsPlaceLabel(current);
    if (labelFromUrl) return { label: labelFromUrl };
    if (!response?.ok || !response.headers.get('content-type')?.includes('text/html')) return { label: null };
    const reader = response.body?.getReader();
    if (!reader) return { label: null };
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (length < 1_000_000) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value.subarray(0, 1_000_000 - length);
      chunks.push(chunk);
      length += chunk.length;
      if (chunk.length < value.length) break;
    }
    const html = new TextDecoder().decode(Buffer.concat(chunks));
    const title = html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]
      ?.replace(/&#39;|&#x27;/gi, "'").replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
      .replace(/\s*[-|–]\s*Google Maps\s*$/i, '').trim();
    return { label: title && title.toLowerCase() !== 'google maps' ? title : null };
  }

  private mapsPlaceLabel(url: URL): string | null {
    const raw = url.pathname.match(/\/maps\/(?:place|search)\/([^/]+)/i)?.[1]
      ?? url.searchParams.get('query')
      ?? url.searchParams.get('q');
    if (!raw) return null;
    const label = decodeURIComponent(raw.replaceAll('+', ' ')).trim();
    return /^-?\d+(?:\.\d+)?[, ]+-?\d+(?:\.\d+)?$/.test(label) || label.length > 140 ? null : label;
  }

  async update(id: number, data: Partial<Boutique>, token?: string) {
    const ownerId = await this.getOwnerId(token);
    const boutique = await this.findOne(id);
    if (boutique.proprietaireId !== ownerId) throw new ForbiddenException('Tu ne peux modifier que ta propre boutique.');
    if (data.category !== undefined && data.category.trim() !== boutique.category) await this.assertCategoryExists(data.category);
    delete data.proprietaireId;
    return this.boutiqueRepository.updateBoutique(boutique.id, data);
  }

  private async assertCategoryExists(category?: string) {
    if (!category?.trim() || !await this.categories.findByName(category)) {
      throw new BadRequestException('Choisissez une catégorie de boutique valide.');
    }
  }

  async remove(id: number, token?: string) {
    const ownerId = await this.getOwnerId(token);
    const boutique = await this.findOne(id);
    if (boutique.proprietaireId !== ownerId) throw new ForbiddenException('Tu ne peux supprimer que ta propre boutique.');
    return this.boutiqueRepository.deleteBoutique(boutique.id);
  }
}
