import { Body, Controller, Delete, Get, Param, Post, Put, UploadedFile, UseInterceptors, Res, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { BoutiqueService } from './boutique.service';
import { Boutique } from './boutique.model';
import { UploadService } from '../upload/upload.service';


@Controller('boutique')
export class BoutiqueController {

  constructor(private readonly boutiqueService: BoutiqueService,private readonly uploadService: UploadService) {}

  // CREATE (multipart/form-data support)
  @Post()
  @UseInterceptors(FileInterceptor('logo'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,) {
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

      logo: logoPath,

      active: typeof data.active === 'string' ? data.active === 'true' : data.active,

      proprietaireId: data.proprietaireId ? Number(data.proprietaireId) : undefined,
    };

    return this.boutiqueService.create(payload);
  }

  // Serve uploaded logos without adding a new dependency
  @Get('logo/:filename')
  async getLogo(@Param('filename') filename: string, @Res() res: Response) {
    // Sends file from the uploads directory
    return res.sendFile(filename, { root: 'uploads' });}

  // GET ALL
  @Get()
  async findAll() { return this.boutiqueService.findAll();}

  // GET ONE
  @Get(':id')
  async findOne(@Param('id') id: string) { return this.boutiqueService.findOne(Number(id));}

  // UPDATE (JSON body; you may create another endpoint to handle multipart updates if needed)
  // UPDATE
  @Put(':id')
  @UseInterceptors( FileInterceptor('logo'))
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,) {
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

      // nouveau logo ou ancien conservé
      logo: logoPath || data.logo,

      active: typeof data.active === 'string' ? data.active === 'true' : data.active,

      proprietaireId: data.proprietaireId ? Number(data.proprietaireId) : undefined,
    };

    return this.boutiqueService.update(Number(id), payload,);
  }

  // DELETE
  @Delete(':id')
  async remove(@Param('id') id: string) { return this.boutiqueService.remove(Number(id));}
}