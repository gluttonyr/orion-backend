import {
  Controller,
  Get,
  Param,
  Res
} from '@nestjs/common';
import type { Response } from 'express';
import * as path from 'path';

@Controller('upload')
export class UploadController {

  @Get(':filename')
  getImage(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', filename);
    return res.sendFile(filePath, { root: '.' });
  }
}