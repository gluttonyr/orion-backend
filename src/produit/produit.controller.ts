import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ProduitService } from './produit.service';
import { Produit } from './produit.model';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/upload/multer.config';
import { UploadService } from 'src/upload/upload.service';

@Controller('produits')
export class ProduitController {
  constructor(private readonly produitService: ProduitService,private readonly uploadService: UploadService) {}

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
  @Body() body: Partial<Produit>,
) {

  console.log('Received files:', files);
  console.log('Received body:', body);

  let image: string | undefined;

  // image principale
  if (files.image?.[0]) {
    image = await this.uploadService.saveFile(
      files.image[0],
      'produits',
    );
  }

  // images secondaires
  let images_secondaires: string[] = [];

  if (files.images_secondaires?.length) {
    images_secondaires = await Promise.all(
      files.images_secondaires.map((file) =>
        this.uploadService.saveFile(
          file,
          'produits',
        ),
      ),
    );
  }


  return this.produitService.create({
    ...body,
    image,
    images_secondaires,
  });
}

  // GET ALL
  @Get()
  findAll() {
    return this.produitService.findAll();
  }

  // GET ONE
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.produitService.findOne(Number(id));
  }

  // UPDATE
  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<Produit>) {
    return this.produitService.update(Number(id), body);
  }

  @Patch(':id')
  updatePartial(@Param('id') id: string, @Body() body: Partial<Produit>) {
    return this.produitService.update(Number(id), body);
  }

  // DELETE
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.produitService.remove(Number(id));
  }
}