import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {

  getUploadPath(): string {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    return uploadPath;
  }

  generateFileName(file: Express.Multer.File): string {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext)
      .replace(/\s/g, '_');

    return `${name}-${Date.now()}${ext}`;
  }
}