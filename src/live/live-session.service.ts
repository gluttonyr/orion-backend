import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { In, IsNull, Repository } from 'typeorm';
import { Boutique } from '../boutique/boutique.model';
import { Produit } from '../produit/produit.model';
import { UserRole, Utilisateur } from '../utilisateur/utilisateur.model';
import { Vente } from '../vente/vente.model';
import { LiveSession } from './live-session.model';
import { LiveVisit } from './live-visit.model';

export interface StartLiveSessionDto {
  tiktokUrl: string;
  boutiqueId: number;
  productIds?: number[];
}

@Injectable()
export class LiveSessionService {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(LiveSession) private readonly sessions: Repository<LiveSession>,
    @InjectRepository(LiveVisit) private readonly visits: Repository<LiveVisit>,
    @InjectRepository(Boutique) private readonly boutiques: Repository<Boutique>,
    @InjectRepository(Produit) private readonly products: Repository<Produit>,
    @InjectRepository(Utilisateur) private readonly users: Repository<Utilisateur>,
    @InjectRepository(Vente) private readonly sales: Repository<Vente>,
  ) {}

  private async getOwnerId(authorization?: string): Promise<number> {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Authentification requise');
    let subject: number;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number }>(token);
      subject = Number(payload.sub);
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }
    if (!Number.isInteger(subject) || subject <= 0) {
      throw new UnauthorizedException('Identifiant de compte invalide');
    }
    const user = await this.users.findOne({ where: { id: subject } });
    if (!user) throw new UnauthorizedException('Compte introuvable');
    if (user.role !== UserRole.COMMERCANT) {
      throw new ForbiddenException('Cette fonctionnalité est réservée aux commerçants');
    }
    return user.id;
  }

  private async ownedSession(authorization: string | undefined, id: number) {
    const ownerId = await this.getOwnerId(authorization);
    const session = await this.sessions.findOne({
      where: { id, ownerId },
      relations: ['boutique', 'produits'],
    });
    if (!session) throw new NotFoundException('Session Live introuvable');
    return session;
  }

  async start(authorization: string | undefined, input: StartLiveSessionDto) {
    const ownerId = await this.getOwnerId(authorization);
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(input.tiktokUrl);
    } catch {
      throw new BadRequestException('Lien TikTok invalide');
    }
    if (
      !['http:', 'https:'].includes(parsedUrl.protocol) ||
      !/(^|\.)tiktok\.com$/i.test(parsedUrl.hostname)
    ) {
      throw new BadRequestException('Le lien doit pointer vers TikTok');
    }
    if (!Number.isInteger(input.boutiqueId) || input.boutiqueId <= 0) {
      throw new BadRequestException('Une boutique valide est requise');
    }
    if (input.productIds !== undefined && !Array.isArray(input.productIds)) {
      throw new BadRequestException('La sélection des produits est invalide');
    }
    const productIds = [...new Set((input.productIds ?? []).map(Number))];
    if (productIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new BadRequestException('La sélection contient un produit invalide');
    }
    const active = await this.sessions.findOne({ where: { ownerId, endedAt: IsNull() } });
    if (active) throw new BadRequestException('Termine le Live en cours avant d’en démarrer un autre');

    const boutique = await this.boutiques.findOne({
      where: { id: input.boutiqueId, proprietaireId: ownerId },
    });
    if (!boutique) throw new NotFoundException('Boutique introuvable ou non autorisée');

    const products = productIds.length
      ? await this.products.find({ where: { id: In(productIds), proprietaireId: ownerId } })
      : [];
    if (products.length !== productIds.length) {
      throw new BadRequestException('Les produits sélectionnés doivent être rattachés à ton compte commerçant');
    }

    const productsById = new Map(products.map((product) => [product.id, product]));
    const selectedProducts = productIds.map((id) => productsById.get(id)).filter((product): product is Produit => !!product);
    if (selectedProducts.length !== productIds.length) {
      throw new BadRequestException('Un ou plusieurs produits sélectionnés sont introuvables');
    }

    const session = this.sessions.create({
      ownerId,
      boutiqueId: boutique.id,
      boutique,
      produits: selectedProducts,
      tiktokUrl: parsedUrl.toString(),
      startedAt: new Date(),
      endedAt: null,
    });
    return this.withResults(await this.sessions.save(session));
  }

  async current(authorization: string | undefined) {
    const ownerId = await this.getOwnerId(authorization);
    const session = await this.sessions.findOne({
      where: { ownerId, endedAt: IsNull() },
      relations: ['boutique', 'produits'],
      order: { startedAt: 'DESC' },
    });
    return session ? this.withResults(session) : null;
  }

  async publicCurrent(ownerId: number) {
    if (!Number.isInteger(ownerId) || ownerId <= 0) {
      throw new BadRequestException('Identifiant commerçant invalide');
    }
    const session = await this.sessions.findOne({
      where: { ownerId, endedAt: IsNull() },
      select: {
        id: true,
        ownerId: true,
        boutiqueId: true,
        tiktokUrl: true,
        startedAt: true,
        endedAt: true,
      },
      order: { startedAt: 'DESC' },
    });
    return session;
  }

  async history(authorization: string | undefined) {
    const ownerId = await this.getOwnerId(authorization);
    const sessions = await this.sessions.find({
      where: { ownerId },
      relations: ['boutique', 'produits'],
      order: { startedAt: 'DESC' },
    });
    return Promise.all(sessions.map((session) => this.withResults(session)));
  }

  async finish(authorization: string | undefined, id: number) {
    const session = await this.ownedSession(authorization, id);
    if (session.endedAt) return this.withResults(session);
    session.endedAt = new Date();
    return this.withResults(await this.sessions.save(session));
  }

  async results(authorization: string | undefined, id: number) {
    return this.withResults(await this.ownedSession(authorization, id));
  }

  async recordVisit(sessionId: number, productId: number) {
    const session = await this.sessions.findOne({
      where: { id: sessionId, endedAt: IsNull() },
      relations: ['produits'],
    });
    if (!session || !session.produits.some((product) => product.id === productId)) {
      throw new NotFoundException('Le Live ou le produit suivi n’est plus disponible');
    }
    const produit = await this.products.findOne({ where: { id: productId } });
    if (!produit) throw new NotFoundException('Produit introuvable');
    await this.visits.save(this.visits.create({ session, produit }));
    return { recorded: true, liveSessionId: session.id };
  }

  async findAttributableSession(sessionId: number, productIds: number[]) {
    const session = await this.sessions.findOne({
      where: { id: sessionId, endedAt: IsNull() },
      relations: ['produits'],
    });
    if (!session) return null;
    const sessionProductIds = new Set(session.produits.map((product) => product.id));
    return productIds.some((id) => sessionProductIds.has(id)) ? session : null;
  }

  private async withResults(session: LiveSession) {
    const [visits, orders] = await Promise.all([
      this.visits.count({ where: { session: { id: session.id } } }),
      this.sales.find({ where: { liveSessionId: session.id, statut: 'payee' } }),
    ]);
    return {
      ...session,
      results: {
        visits,
        orders: orders.length,
        revenue: orders.reduce((total, order) => total + Number(order.prix_total || 0), 0),
      },
    };
  }
}
