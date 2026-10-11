import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, UnauthorizedException, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ProduitService } from './produit.service';
import { Produit } from './produit.model';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../upload/multer.config';
import { UploadService } from '../upload/upload.service';
import { JwtService } from '@nestjs/jwt';

@Controller('produits')
export class ProduitController {
  constructor(
    private readonly produitService: ProduitService,
    private readonly uploadService: UploadService,
    private readonly jwt: JwtService,
  ) {}

  // CREATE
 @Post()
@UseInterceptors(
  FileFieldsInterceptor([
    { name: 'image', maxCount: 1 },
    { name: 'images_secondaires', maxCount: 5 },
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
    image: image ?? body.image,
    images_secondaires,
    proprietaireId,
  });
}

  // GET ALL
  @Get()
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
  findOne(@Param('id') id: string) {
    return this.produitService.findOne(Number(id));
  }

  // UPDATE
  @Put(':id')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  async update(
    @Param('id') id: string,
    @Body() body: Partial<Produit> & { categorieId?: string },
    @UploadedFiles() files: { image?: Express.Multer.File[] },
  ) {
    return this.updateProduit(Number(id), body, files?.image?.[0]);
  }

  @Patch(':id')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  updatePartial(
    @Param('id') id: string,
    @Body() body: Partial<Produit> & { categorieId?: string },
    @UploadedFiles() files: { image?: Express.Multer.File[] },
  ) {
    return this.updateProduit(Number(id), body, files?.image?.[0]);
  }

  // DELETE
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.produitService.remove(Number(id));
  }

  private async updateProduit(id: number, body: Partial<Produit> & { categorieId?: string }, imageFile?: Express.Multer.File) {
    const { proprietaireId: _ownerIgnored, categorieId, categorie: _legacyCategorie, ...safeBody } = body;
    const categoryId = categorieId === undefined ? undefined : Number(categorieId);
    const image = imageFile ? await this.uploadService.saveFile(imageFile, 'produits') : undefined;
    return this.produitService.update(id, {
      ...safeBody,
      ...(categoryId === undefined ? {} : { categorie: Number.isInteger(categoryId) && categoryId > 0 ? ({ id: categoryId } as any) : null }),
      ...(image ? { image } : {}),
    });
  }
}
