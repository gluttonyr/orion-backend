import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ShortService } from './short.service';

@Controller('shorts')
export class ShortController {
  constructor(private readonly shortService: ShortService) {}

  @Post()
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'video', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]))
  create(
    @Headers('authorization') authorization: string,
    @UploadedFiles() files: { video?: Express.Multer.File[]; cover?: Express.Multer.File[] },
    @Body() body: { titre?: string; description?: string; produitId?: string },
  ) {
    return this.shortService.create(
      authorization?.replace(/^Bearer\s+/i, ''),
      files?.video?.[0],
      files?.cover?.[0],
      body,
    );
  }

  @Get()
  feed(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.shortService.feed(Number(page) || 1, Number(limit) || 10, authorization?.replace(/^Bearer\s+/i, ''));
  }

  @Get('mine')
  mine(@Headers('authorization') authorization: string) {
    return this.shortService.mine(authorization?.replace(/^Bearer\s+/i, ''));
  }

  @Get('creator/:auteurId')
  getCreatorProfile(
    @Param('auteurId', ParseIntPipe) auteurId: number,
    @Headers('authorization') authorization: string,
  ) {
    return this.shortService.getCreatorProfile(auteurId, authorization?.replace(/^Bearer\s+/i, ''));
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number, @Headers('authorization') authorization: string) {
    return this.shortService.getById(id, authorization?.replace(/^Bearer\s+/i, ''));
  }

  @Post(':id/likes')
  toggleLike(@Param('id', ParseIntPipe) id: number, @Headers('authorization') authorization: string) {
    return this.shortService.toggleLike(id, authorization?.replace(/^Bearer\s+/i, ''));
  }

  @Get(':id/comments')
  getComments(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.shortService.getComments(id, Number(page) || 1, Number(limit) || 20);
  }

  @Post(':id/comments')
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { contenu?: string },
    @Headers('authorization') authorization: string,
  ) {
    return this.shortService.addComment(id, body?.contenu, authorization?.replace(/^Bearer\s+/i, ''));
  }

  @Delete(':id/comments/:commentId')
  deleteComment(
    @Param('id', ParseIntPipe) id: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Headers('authorization') authorization: string,
  ) {
    return this.shortService.deleteComment(id, commentId, authorization?.replace(/^Bearer\s+/i, ''));
  }

  @Post(':id/share')
  registerShare(@Param('id', ParseIntPipe) id: number, @Headers('authorization') authorization: string) {
    return this.shortService.registerShare(id, authorization?.replace(/^Bearer\s+/i, ''));
  }

  @Post(':id/view')
  addView(@Param('id', ParseIntPipe) id: number) {
    return this.shortService.addView(id);
  }

  @Get(':id/cover')
  async cover(@Param('id', ParseIntPipe) id: number, @Res() response: Response) {
    const filePath = await this.shortService.coverFile(id);
    if (!fs.existsSync(filePath)) return response.sendStatus(404);
    return response.sendFile(filePath);
  }

  @Get(':id/video')
  async video(
    @Param('id', ParseIntPipe) id: number,
    @Headers('range') range: string | undefined,
    @Res() response: Response,
  ) {
    const { item, path: filePath } = await this.shortService.videoFile(id);
    if (!fs.existsSync(filePath)) return response.sendStatus(404);
    const size = fs.statSync(filePath).size;
    const contentType = this.videoContentType(filePath);
    response.setHeader('Accept-Ranges', 'bytes');
    response.setHeader('Content-Type', contentType);
    response.setHeader('Cache-Control', 'public, max-age=3600');

    if (!range) {
      response.setHeader('Content-Length', size);
      return fs.createReadStream(filePath).pipe(response);
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match || (!match[1] && !match[2])) {
      response.setHeader('Content-Range', `bytes */${size}`);
      return response.sendStatus(416);
    }
    let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    let end = match[2] && match[1] ? Number(match[2]) : size - 1;
    if (!match[1] && match[2]) end = size - 1;
    if (start > end || start >= size) {
      response.setHeader('Content-Range', `bytes */${size}`);
      return response.sendStatus(416);
    }
    end = Math.min(end, size - 1);
    response.status(206);
    response.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    response.setHeader('Content-Length', end - start + 1);
    return fs.createReadStream(filePath, { start, end }).pipe(response);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Headers('authorization') authorization: string) {
    return this.shortService.remove(id, authorization?.replace(/^Bearer\s+/i, ''));
  }

  private videoContentType(filePath: string) {
    switch (path.extname(filePath).toLowerCase()) {
      case '.mov': return 'video/quicktime';
      case '.webm': return 'video/webm';
      default: return 'video/mp4';
    }
  }
}
