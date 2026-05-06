import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {

  public getBaseUploadPath(): string {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    return uploadPath;
  }

  public generateFileName(file: Express.Multer.File): string {
    const ext = path.extname(file.originalname);

    const name = path
      .basename(file.originalname, ext)
      .replace(/\s+/g, '_')
      .replace(/[^\w\-]/g, '');

    return `${name}-${Date.now()}${ext}`;
  }

  async saveFile(
    file: Express.Multer.File,
    prefix?: string,
  ): Promise<string> {

    const basePath = this.getBaseUploadPath();

    const folderPath = prefix
      ? path.join(basePath, prefix)
      : basePath;

    // Création dossier si absent
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const fileName = this.generateFileName(file);

    const fullPath = path.join(folderPath, fileName);
    console.log('Saving file to:', fullPath);

    // Sauvegarde fichier
    if (file.buffer) {
  fs.writeFileSync(fullPath, file.buffer);
} else if (file.path) {
  fs.copyFileSync(file.path, fullPath);
} else {
  throw new Error("Fichier invalide (ni buffer ni path)");
}

    // Retourne chemin relatif
    return prefix
      ? `${prefix}/${fileName}`
      : fileName;
  }
}