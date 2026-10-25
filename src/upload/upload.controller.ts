import {
  Controller,
  Get,
  Param,
  Res
} from '@nestjs/common';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { Public } from '../auth/public.decorator';
import { getUploadRoot } from './upload-root';

@Controller('upload')
export class UploadController {

  @Get('*path')
  @Public()
  getImage(@Param('path') requestedPath: string | string[], @Res() res: Response) {
    const uploadRoot = getUploadRoot();
    const relativePath = Array.isArray(requestedPath) ? path.join(...requestedPath) : requestedPath;
    const filePath = path.resolve(uploadRoot, relativePath);
    if (!filePath.startsWith(`${uploadRoot}${path.sep}`)) return res.sendStatus(400);
    if (!fs.existsSync(filePath)) return res.sendStatus(404);
    return res.sendFile(filePath);
}
}
