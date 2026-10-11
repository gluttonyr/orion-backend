import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Short } from './short.model';
import { ShortComment, ShortLike } from './short-social.model';
import { Utilisateur } from '../utilisateur/utilisateur.model';
import { Produit } from '../produit/produit.model';

const allowedVideoTypes = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const allowedCoverTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class ShortService {
  constructor(
    @InjectRepository(Short) private readonly shorts: Repository<Short>,
    @InjectRepository(ShortLike) private readonly likes: Repository<ShortLike>,
    @InjectRepository(ShortComment) private readonly comments: Repository<ShortComment>,
    @InjectRepository(Utilisateur) private readonly users: Repository<Utilisateur>,
    @InjectRepository(Produit) private readonly products: Repository<Produit>,
    private readonly jwt: JwtService,
  ) {}

  async userIdFromToken(token?: string): Promise<number> {
    if (!token) throw new UnauthorizedException('Authentification requise');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number }>(token);
      const id = Number(payload.sub);
      if (!Number.isInteger(id) || id < 1) throw new Error('Invalid subject');
      return id;
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }

  async create(
    token: string | undefined,
    video: Express.Multer.File | undefined,
    cover: Express.Multer.File | undefined,
    input: { titre?: string; description?: string; produitId?: string },
  ) {
    let auteurId: number;
    try {
      auteurId = await this.userIdFromToken(token);
    } catch (error) {
      if (video) this.removeFile(video.path);
      if (cover) this.removeFile(cover.path);
      throw error;
    }
    if (!video) {
      if (cover) this.removeFile(cover.path);
      throw new BadRequestException('Le fichier video est obligatoire');
    }
    if (!allowedVideoTypes.has(video.mimetype)) {
      this.removeFile(video.path);
      if (cover) this.removeFile(cover.path);
      throw new BadRequestException('Format vidéo accepté : MP4, MOV ou WebM');
    }
    if (cover && !allowedCoverTypes.has(cover.mimetype)) {
      this.removeFile(video.path);
      this.removeFile(cover.path);
      throw new BadRequestException('La couverture doit être une image JPEG, PNG ou WebP');
    }

    const titre = input.titre?.trim();
    if (!titre || titre.length > 120) {
      this.removeFile(video.path);
      if (cover) this.removeFile(cover.path);
      throw new BadRequestException('Un titre de 1 à 120 caractères est obligatoire');
    }

    let produit: Produit | null = null;
    if (input.produitId?.trim()) {
      const produitId = Number(input.produitId);
      if (!Number.isInteger(produitId) || produitId < 1) {
        this.removeFile(video.path);
        if (cover) this.removeFile(cover.path);
        throw new BadRequestException('Produit invalide');
      }
      produit = await this.products.findOne({ where: { id: produitId } });
      if (!produit) {
        this.removeFile(video.path);
        if (cover) this.removeFile(cover.path);
        throw new BadRequestException('Produit introuvable');
      }
      if (produit.proprietaireId !== auteurId) {
        this.removeFile(video.path);
        if (cover) this.removeFile(cover.path);
        throw new ForbiddenException('Vous ne pouvez référencer que vos propres produits');
      }
    }

    const relative = (file?: Express.Multer.File) =>
      file ? path.relative(path.resolve(process.env.UPLOAD_PATH || './uploads'), file.path).replace(/\\/g, '/') : null;

    try {
      const short = this.shorts.create({
        titre,
        description: input.description?.trim() || null,
        videoPath: relative(video)!,
        coverPath: relative(cover),
        tailleOctets: video.size,
        auteurId,
        produitId: produit?.id ?? null,
        produit,
        publie: true,
      });
      return (await this.decorate([await this.shorts.save(short)], auteurId))[0];
    } catch (error) {
      this.removeFile(video.path);
      if (cover) this.removeFile(cover.path);
      throw error;
    }
  }

  async feed(page = 1, limit = 10, token?: string) {
    const safePage = Math.max(1, Math.floor(page) || 1);
    const safeLimit = Math.min(30, Math.max(1, Math.floor(limit) || 10));
    const [items, total] = await this.shorts.findAndCount({
      where: { publie: true },
      relations: { auteur: true, produit: true },
      order: { creeLe: 'DESC', id: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    const userId = await this.optionalUserIdFromToken(token);
    return { items: await this.decorate(items, userId), page: safePage, limit: safeLimit, total, hasMore: safePage * safeLimit < total };
  }

  async mine(token?: string) {
    const auteurId = await this.userIdFromToken(token);
    const items = await this.shorts.find({ where: { auteurId }, relations: { auteur: true, produit: true }, order: { creeLe: 'DESC' } });
    return this.decorate(items, auteurId);
  }

  async getById(id: number, token?: string) {
    const item = await this.findPublished(id);
    return (await this.decorate([item], await this.optionalUserIdFromToken(token)))[0];
  }

  async getCreatorProfile(auteurId: number, token?: string) {
    const auteur = await this.users.findOne({ where: { id: auteurId } });
    if (!auteur) throw new NotFoundException('Profil introuvable');
    const shorts = await this.shorts.find({
      where: { auteurId, publie: true },
      relations: { auteur: true, produit: true },
      order: { creeLe: 'DESC', id: 'DESC' },
    });
    return {
      auteur: {
        id: auteur.id,
        nom: auteur.nom,
        prenom: auteur.prenom,
        image: auteur.image,
        role: auteur.role,
        specialite: auteur.specialite,
        localisation: auteur.localisation,
      },
      shorts: await this.decorate(shorts, await this.optionalUserIdFromToken(token)),
    };
  }

  async findPublished(id: number) {
    const item = await this.shorts.findOne({ where: { id, publie: true }, relations: { auteur: true, produit: true } });
    if (!item) throw new NotFoundException('Short introuvable');
    return item;
  }

  async videoFile(id: number) {
    const item = await this.findPublished(id);
    return { item, path: this.absoluteUploadPath(item.videoPath) };
  }

  async coverFile(id: number) {
    const item = await this.findPublished(id);
    if (!item.coverPath) throw new NotFoundException('Couverture introuvable');
    return this.absoluteUploadPath(item.coverPath);
  }

  async addView(id: number) {
    const item = await this.findPublished(id);
    await this.shorts.increment({ id: item.id }, 'vues', 1);
    return { id: item.id, vues: item.vues + 1 };
  }

  async toggleLike(id: number, token?: string) {
    const utilisateurId = await this.userIdFromToken(token);
    const short = await this.findPublished(id);
    const existing = await this.likes.findOne({ where: { shortId: short.id, utilisateurId } });
    let liked: boolean;
    if (existing) {
      await this.likes.remove(existing);
      liked = false;
    } else {
      try {
        await this.likes.save(this.likes.create({ shortId: short.id, utilisateurId }));
        liked = true;
      } catch (error) {
        // A repeated request can race with the unique short/user constraint.
        const raced = await this.likes.findOne({ where: { shortId: short.id, utilisateurId } });
        if (!raced) throw error;
        liked = true;
      }
    }
    return { liked, likes: await this.likes.count({ where: { shortId: short.id } }) };
  }

  async getComments(id: number, page = 1, limit = 20) {
    const short = await this.findPublished(id);
    const safePage = Math.max(1, Math.floor(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Math.floor(limit) || 20));
    const [items, total] = await this.comments.findAndCount({
      where: { shortId: short.id },
      relations: { utilisateur: true },
      order: { creeLe: 'DESC', id: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    return {
      items: items.map((comment) => this.commentDto(comment)),
      page: safePage,
      limit: safeLimit,
      total,
      hasMore: safePage * safeLimit < total,
    };
  }

  async addComment(id: number, contenu: string | undefined, token?: string) {
    const utilisateurId = await this.userIdFromToken(token);
    const short = await this.findPublished(id);
    const text = contenu?.trim();
    if (!text) throw new BadRequestException('Le commentaire ne peut pas être vide');
    if (text.length > 1000) throw new BadRequestException('Le commentaire ne peut pas dépasser 1000 caractères');
    const comment = await this.comments.save(this.comments.create({ shortId: short.id, utilisateurId, contenu: text }));
    const saved = await this.comments.findOne({ where: { id: comment.id }, relations: { utilisateur: true } });
    return this.commentDto(saved!);
  }

  async deleteComment(shortId: number, commentId: number, token?: string) {
    const utilisateurId = await this.userIdFromToken(token);
    await this.findPublished(shortId);
    const comment = await this.comments.findOne({ where: { id: commentId, shortId } });
    if (!comment) throw new NotFoundException('Commentaire introuvable');
    if (comment.utilisateurId !== utilisateurId) throw new ForbiddenException('Vous ne pouvez supprimer que vos propres commentaires');
    await this.comments.remove(comment);
    return { message: 'Commentaire supprimé' };
  }

  async registerShare(id: number, token?: string) {
    await this.userIdFromToken(token);
    const short = await this.findPublished(id);
    await this.shorts.increment({ id: short.id }, 'partages', 1);
    return { id: short.id, partages: short.partages + 1 };
  }

  async remove(id: number, token?: string) {
    const auteurId = await this.userIdFromToken(token);
    const item = await this.shorts.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Short introuvable');
    if (item.auteurId !== auteurId) throw new ForbiddenException('Vous ne pouvez supprimer que vos propres Shorts');
    await this.shorts.remove(item);
    this.removeFile(this.absoluteUploadPath(item.videoPath));
    if (item.coverPath) this.removeFile(this.absoluteUploadPath(item.coverPath));
    return { message: 'Short supprimé' };
  }

  private async optionalUserIdFromToken(token?: string): Promise<number | undefined> {
    if (!token) return undefined;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number }>(token);
      const id = Number(payload.sub);
      return Number.isInteger(id) && id > 0 ? id : undefined;
    } catch {
      return undefined;
    }
  }

  private async decorate(items: Short[], utilisateurId?: number) {
    return Promise.all(items.map(async (item) => {
      const [likes, commentaires, liked] = await Promise.all([
        this.likes.count({ where: { shortId: item.id } }),
        this.comments.count({ where: { shortId: item.id } }),
        utilisateurId ? this.likes.exist({ where: { shortId: item.id, utilisateurId } }) : Promise.resolve(false),
      ]);
      return this.toDto(item, likes, commentaires, liked);
    }));
  }

  private toDto(item: Short, likes: number, commentaires: number, likedByMe: boolean) {
    return {
      id: item.id,
      titre: item.titre,
      description: item.description,
      videoUrl: `/shorts/${item.id}/video`,
      coverUrl: item.coverPath ? `/shorts/${item.id}/cover` : null,
      tailleOctets: item.tailleOctets,
      vues: item.vues,
      likes,
      commentaires,
      partages: item.partages ?? 0,
      likedByMe,
      publie: item.publie,
      creeLe: item.creeLe,
      auteur: item.auteur ? {
        id: item.auteur.id,
        nom: item.auteur.nom,
        prenom: item.auteur.prenom,
        image: item.auteur.image,
      } : { id: item.auteurId },
      produit: item.produit ? {
        id: item.produit.id,
        nom: item.produit.nom,
        description: item.produit.description,
        prix: item.produit.prix,
        stock: item.produit.stock,
        image: item.produit.image,
        proprietaireId: item.produit.proprietaireId,
      } : null,
    };
  }

  private commentDto(comment: ShortComment) {
    return {
      id: comment.id,
      shortId: comment.shortId,
      utilisateurId: comment.utilisateurId,
      contenu: comment.contenu,
      creeLe: comment.creeLe,
      auteur: comment.utilisateur ? {
        id: comment.utilisateur.id,
        nom: comment.utilisateur.nom,
        prenom: comment.utilisateur.prenom,
        image: comment.utilisateur.image,
      } : { id: comment.utilisateurId },
    };
  }

  private absoluteUploadPath(relativePath: string) {
    const root = path.resolve(process.env.UPLOAD_PATH || './uploads');
    const resolved = path.resolve(root, relativePath);
    if (!resolved.startsWith(`${root}${path.sep}`)) throw new NotFoundException('Fichier introuvable');
    return resolved;
  }

  private removeFile(filePath: string) {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}
