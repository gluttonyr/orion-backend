import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {

  private basePath = process.env.UPLOAD_PATH || './uploads';

  saveProfileImage(file: Express.Multer.File): string {
    const profileDir = path.join(this.basePath, 'profile');

    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    // Générer un nom unique
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(profileDir, fileName);

    // Enregistrer le fichier
    fs.writeFileSync(filePath, file.buffer);

    return `profile/${fileName}`; // chemin enregistré en base
  }
}