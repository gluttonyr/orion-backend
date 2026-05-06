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

  @Get('*')
getImage(@Param() params, @Res() res: Response) {
  console.log('Received request for file:', params.path);
  const filePath = path.join(
    process.env.UPLOAD_PATH || './uploads',
    ...params.path
  );

  return res.sendFile(filePath, { root: '.' });
}
}