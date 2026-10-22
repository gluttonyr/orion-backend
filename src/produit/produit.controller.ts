import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, UnauthorizedException, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ProduitService } from './produit.service';
import { Produit } from './produit.model';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../upload/multer.config';
import { UploadService } from '../upload/upload.service';
import { JwtService } from '@nestjs/jwt';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';

@Controller('produits')
export class ProduitController {
  constructor(
    private readonly produitService: ProduitService,
    private readonly uploadService: UploadService,
    private readonly jwt: JwtService,
  ) {}

  // CREATE
 @Post()
@Roles('COMMERCANT')
@UseInterceptors(
  FileFieldsInterceptor([
    { name: 'image', maxCount: 1 },
    { name: 'images_secondaires', maxCount: 3 },
  ]),
)
async create(
  @UploadedFiles()
  files: {
    image?: Express.Multer.File[];
    images_secondaires?: Express.Multer.File[];
  },
  @Body() body: Partial<Produit> & { categorieId?: string },
  @Headers('authorization') authorization?: string,
) {

  const token = authorization?.replace(/^Bearer\s+/i, '');
  if (!token) throw new UnauthorizedException('Connecte-toi avec un compte commerçant pour créer un produit.');
  let proprietaireId: number;
  try {
    const payload = await this.jwt.verifyAsync<{ sub: number; role?: string }>(token);
    if (payload.role !== 'COMMERCANT') throw new Error('Role invalide');
    proprietaireId = Number(payload.sub);
    if (!Number.isInteger(proprietaireId) || proprietaireId <= 0) throw new Error('Compte invalide');
  } catch {
    throw new UnauthorizedException('Session commerçant invalide ou expirée.');
  }

  let image: string | undefined;

  // image principale
  if (files?.image?.[0]) {
    image = await this.uploadService.saveFile(
      files.image[0],
      'produits',
    );
  }
  if (!image) throw new BadRequestException('Téléverse une image principale pour le produit.');

  // images secondaires
  let images_secondaires: string[] = [];

  if (files?.images_secondaires?.length) {
    images_secondaires = await Promise.all(
      files.images_secondaires.map((file) =>
        this.uploadService.saveFile(
          file,
          'produits',
        ),
      ),
    );
  }


  const { categorieId, categorie: _legacyCategorie, ...safeBody } = body;
  const categoryId = Number(categorieId || body.categorieId);
  return this.produitService.create({
    ...safeBody,
    categorie: Number.isInteger(categoryId) && categoryId > 0 ? ({ id: categoryId } as any) : null,
    image,
    images_secondaires,
    proprietaireId,
  });
}

  // GET ALL
  @Get()
  @Public()
  findAll() {
    return this.produitService.findAll();
  }

  @Get('owner/:id')
  async findByOwner(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Authentification requise.');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number; role?: string }>(token);
      if (payload.role !== 'COMMERCANT' || Number(payload.sub) !== Number(id)) throw new Error('Accès refusé');
    } catch {
      throw new UnauthorizedException('Accès aux produits du compte refusé.');
    }
    return this.produitService.findByOwner(Number(id));
  }

  // GET ONE
  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.produitService.findPublishedOne(Number(id));
  }

  @Patch(':id/publish')
  @Roles('COMMERCANT')
  async publish(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    let ownerId: number;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number; role?: string }>(token ?? '');
      if (payload.role !== 'COMMERCANT') throw new Error('Rôle invalide');
      ownerId = Number(payload.sub);
    } catch {
      throw new UnauthorizedException('Session commerçant invalide ou expirée.');
    }
    const product = await this.produitService.findOne(Number(id));
    if (product.proprietaireId !== ownerId) throw new UnauthorizedException('Tu ne peux publier que tes propres produits.');
    return this.produitService.publish(Number(id));
  }

  // UPDATE
  @Put(':id')
  @Roles('COMMERCANT')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }, { name: 'images_secondaires', maxCount: 3 }]))
  async update(
    @Param('id') id: string,
    @Body() body: Partial<Produit> & { categorieId?: string },
    @UploadedFiles() files: { image?: Express.Multer.File[]; images_secondaires?: Express.Multer.File[] },
    @Headers('authorization') authorization?: string,
  ) {
    return this.updateProduit(Number(id), body, files?.image?.[0], files?.images_secondaires, authorization);
  }

  @Patch(':id')
  @Roles('COMMERCANT')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }, { name: 'images_secondaires', maxCount: 3 }]))
  updatePartial(
    @Param('id') id: string,
    @Body() body: Partial<Produit> & { categorieId?: string },
    @UploadedFiles() files: { image?: Express.Multer.File[]; images_secondaires?: Express.Multer.File[] },
    @Headers('authorization') authorization?: string,
  ) {
    return this.updateProduit(Number(id), body, files?.image?.[0], files?.images_secondaires, authorization);
  }

  // DELETE
  @Delete(':id')
  @Roles('COMMERCANT')
  async remove(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    const payload = await this.jwt.verifyAsync<{ sub: number; role?: string }>(token ?? '');
    const product = await this.produitService.findOne(Number(id));
    if (product.proprietaireId !== Number(payload.sub)) {
      throw new UnauthorizedException('Tu ne peux supprimer que tes propres produits.');
    }
    return this.produitService.remove(Number(id));
  }

  private async updateProduit(id: number, body: Partial<Produit> & { categorieId?: string; clearImagesSecondaires?: string }, imageFile?: Express.Multer.File, secondaryImageFiles?: Express.Multer.File[], authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Authentification requise pour modifier ce produit.');
    let proprietaireId: number;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number; role?: string }>(token);
      if (payload.role !== 'COMMERCANT') throw new Error('Rôle invalide');
      proprietaireId = Number(payload.sub);
    } catch {
      throw new UnauthorizedException('Session commerçant invalide ou expirée.');
    }
    const current = await this.produitService.findOne(id);
    if (current.proprietaireId !== proprietaireId) throw new UnauthorizedException('Tu ne peux modifier que tes propres produits.');
    const { proprietaireId: _ownerIgnored, categorieId, categorie: _legacyCategorie, image: _ignoredImageUrl, statut: _statusIgnored, clearImagesSecondaires: _clearFlag, ...safeBody } = body;
    const categoryId = categorieId === undefined ? undefined : Number(categorieId);
    const image = imageFile ? await this.uploadService.saveFile(imageFile, 'produits') : undefined;
    const imagesSecondaires = secondaryImageFiles?.length
      ? await Promise.all(secondaryImageFiles.map((file) => this.uploadService.saveFile(file, 'produits')))
      : body.clearImagesSecondaires === 'true' ? [] : undefined;
    return this.produitService.update(id, {
      ...safeBody,
      ...(categoryId === undefined ? {} : { categorie: Number.isInteger(categoryId) && categoryId > 0 ? ({ id: categoryId } as any) : null }),
      ...(image ? { image } : {}),
      ...(imagesSecondaires === undefined ? {} : { images_secondaires: imagesSecondaires }),
    });
  }
}
