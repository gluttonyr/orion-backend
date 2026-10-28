import { Body, Controller, Delete, Get, Param, Post, Put, UploadedFile, UseInterceptors, Res, Req, Headers } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { BoutiqueService } from './boutique.service';
import { Boutique } from './boutique.model';
import { UploadService } from '../upload/upload.service';
import { getUploadRoot } from '../upload/upload-root';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';


@Controller('boutique')
export class BoutiqueController {

  constructor(private readonly boutiqueService: BoutiqueService,private readonly uploadService: UploadService) {}

  // CREATE (multipart/form-data support)
  @Post()
  @Roles('COMMERCANT')
  @UseInterceptors(FileInterceptor('logo'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Headers('authorization') authorization: string) {
    console.log('Create Boutique - Received data:', body);
    console.log('Create Boutique - Received file:', file);

    const data = body.data ? JSON.parse(body.data) : body;

    let logoPath: string | undefined;

    if (file) {
      logoPath = await this.uploadService.saveFile(file, 'boutiques',);
    }
    
    const payload: Partial<Boutique> = {
      nom: data.nom,
      description: data.description,
      category: data.category,
      location: data.location,
      address: data.address,

      logo: logoPath ?? (typeof data.logo === 'string' ? data.logo : undefined),

      active: typeof data.active === 'string' ? data.active === 'true' : data.active,

      proprietaireId: data.proprietaireId ? Number(data.proprietaireId) : undefined,
    };

    const token = authorization?.replace(/^Bearer\s+/i, '');
    return this.boutiqueService.create(payload, token);
  }

  // Serve uploaded logos without adding a new dependency
  @Get('logo/:filename')
  @Public()
  async getLogo(@Param('filename') filename: string, @Res() res: Response) {
    // Sends file from the uploads directory
    return res.sendFile(filename, { root: getUploadRoot() });}

  // GET ALL
  @Get()
  @Public()
  async findAll() { return this.boutiqueService.findAll();}

  @Get('mine')
  async findMine(@Headers('authorization') authorization: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    return this.boutiqueService.findMine(token);
  }

  @Post('resolve-location')
  @Roles('COMMERCANT', 'UTILISATEUR', 'ADMIN')
  async resolveLocation(@Body() body: { url?: string }) {
    return this.boutiqueService.resolveMapsLocation(body?.url ?? '');
  }

  // GET ONE
  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) { return this.boutiqueService.findOne(Number(id));}

  // UPDATE (JSON body; you may create another endpoint to handle multipart updates if needed)
  // UPDATE
  @Put(':id')
  @Roles('COMMERCANT')
  @UseInterceptors( FileInterceptor('logo'))
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Headers('authorization') authorization: string,
  ) {
    const data = body.data ? JSON.parse(body.data) : body;

    console.log('Update Boutique ID:', id);
    console.log('Received data:', data);
    console.log('Received file:', file);

    let logoPath: string | undefined;

    if (file) { logoPath = await this.uploadService.saveFile(file, 'boutiques',);}

    const payload: Partial<Boutique> = {
      nom: data.nom,
      description: data.description,
      category: data.category,
      location: data.location,
      address: data.address,

      // nouveau logo ou ancien conservé
      logo: logoPath || data.logo,

      active: typeof data.active === 'string' ? data.active === 'true' : data.active,

    };

    return this.boutiqueService.update(Number(id), payload, authorization?.replace(/^Bearer\s+/i, ''));
  }

  // DELETE
  @Delete(':id')
  @Roles('COMMERCANT')
  async remove(@Param('id') id: string, @Headers('authorization') authorization: string) {
    return this.boutiqueService.remove(Number(id), authorization?.replace(/^Bearer\s+/i, ''));
  }
}
