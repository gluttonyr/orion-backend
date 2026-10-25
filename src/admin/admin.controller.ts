import { BadRequestException, Controller, Get, Put, Post, Patch, Delete, Param, UploadedFiles, UploadedFile, UseGuards, UseInterceptors, Body } from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { Public } from '../auth/public.decorator';
import { getUploadRoot } from '../upload/upload-root';

@Controller()
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('admin/users')
  @UseGuards(AdminGuard)
  async users() {
    return this.admin.getUsers();
  }

  @Get('admin/dashboard-stats')
  @UseGuards(AdminGuard)
  dashboardStats() {
    return this.admin.getDashboardStats();
  }

  @Get('admin/orders')
  @UseGuards(AdminGuard)
  async orders() {
    return this.admin.getOrders();
  }

  @Get('admin/wallet')
  @UseGuards(AdminGuard)
  async wallet() {
    return this.admin.getPlatformWallet();
  }

  @Get('site-settings')
  @Public()
  siteSettings() {
    return this.admin.getSiteSettings();
  }

  @Get('about/team')
  @Public()
  aboutTeam() { return this.admin.getAboutTeam(); }

  @Post('admin/about/team')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({
      destination: (_req, _file, callback) => {
        const directory = getUploadRoot();
        if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
        callback(null, directory);
      },
      filename: (_req, file, callback) => callback(null, `about-${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => callback(file.mimetype.startsWith('image/') ? null : new BadRequestException('Seules les images sont acceptées.'), file.mimetype.startsWith('image/')),
  }))
  async createAboutTeamMember(@Body() body: { name: string; role: string; bio?: string; position?: number }, @UploadedFile() photo?: Express.Multer.File) {
    try { return await this.admin.saveAboutTeamMember(body, photo?.filename); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Impossible de créer ce profil.'); }
  }

  @Patch('admin/about/team/:id')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({ destination: (_req, _file, callback) => { const directory = getUploadRoot(); if (!existsSync(directory)) mkdirSync(directory, { recursive: true }); callback(null, directory); }, filename: (_req, file, callback) => callback(null, `about-${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`) }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => callback(file.mimetype.startsWith('image/') ? null : new BadRequestException('Seules les images sont acceptées.'), file.mimetype.startsWith('image/')),
  }))
  async updateAboutTeamMember(@Param('id') id: string, @Body() body: { name: string; role: string; bio?: string; position?: number }, @UploadedFile() photo?: Express.Multer.File) {
    try { return await this.admin.saveAboutTeamMember(body, photo?.filename, Number(id)); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Impossible de modifier ce profil.'); }
  }

  @Delete('admin/about/team/:id')
  @UseGuards(AdminGuard)
  async deleteAboutTeamMember(@Param('id') id: string) {
    try { return await this.admin.deleteAboutTeamMember(Number(id)); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Impossible de supprimer ce profil.'); }
  }

  @Get('admin/merchants')
  @UseGuards(AdminGuard)
  merchants() { return this.admin.getMerchants(); }

  @Get('admin/merchants/:id/products')
  @UseGuards(AdminGuard)
  async merchantProducts(@Param('id') id: string) {
    try { return await this.admin.getMerchantProducts(Number(id)); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Impossible de charger les produits du marchand.'); }
  }

  @Get('admin/carousel-products')
  @UseGuards(AdminGuard)
  carouselProducts() { return this.admin.getCarouselProducts(); }

  @Put('admin/site-settings')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'heroImagesFiles', maxCount: 3 },
  ], {
    storage: diskStorage({
      destination: (_request, _file, callback) => {
        const directory = getUploadRoot();
        if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
        callback(null, directory);
      },
      filename: (_request, file, callback) => {
        callback(null, `site-${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      const isImage = file.mimetype.startsWith('image/');
      callback(isImage ? null : new BadRequestException('Seules les images sont acceptées.'), isImage);
    },
  }))
  async updateSiteSettings(
    @Body() body: { heroImages?: string; carouselProductIds?: string },
    @UploadedFiles() files: { heroImagesFiles?: Express.Multer.File[] },
  ) {
    try { return await this.admin.updateSiteSettings(body, files ?? {}); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Impossible d’enregistrer les réglages du site.'); }
  }
}
