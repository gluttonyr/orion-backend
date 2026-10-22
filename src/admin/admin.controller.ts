import { BadRequestException, Controller, Get, Put, UploadedFiles, UseGuards, UseInterceptors, Body } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { Public } from '../auth/public.decorator';

@Controller()
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('admin/users')
  @UseGuards(AdminGuard)
  async users() {
    return this.admin.getUsers();
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

  @Put('admin/site-settings')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'heroImagesFiles', maxCount: 3 },
    { name: 'carouselImagesFiles', maxCount: 10 },
  ], {
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      const isImage = file.mimetype.startsWith('image/');
      callback(isImage ? null : new BadRequestException('Seules les images sont acceptées.'), isImage);
    },
  }))
  async updateSiteSettings(
    @Body() body: { heroImages?: string; carouselImages?: string },
    @UploadedFiles() files: { heroImagesFiles?: Express.Multer.File[]; carouselImagesFiles?: Express.Multer.File[] },
  ) {
    try { return await this.admin.updateSiteSettings(body, files ?? {}); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Impossible d’enregistrer les réglages du site.'); }
  }
}
