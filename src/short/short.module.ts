import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { Short } from './short.model';
import { ShortComment, ShortLike } from './short-social.model';
import { Utilisateur } from '../utilisateur/utilisateur.model';
import { Produit } from '../produit/produit.model';
import { ShortController } from './short.controller';
import { ShortService } from './short.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Short, ShortLike, ShortComment, Utilisateur, Produit]),
    JwtModule.register({ secret: process.env.JWT_SECRET || 'orion_secret_key' }),
    // Video uploads need a separate limit from the 5 MB image upload module.
    MulterModule.register({
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          const uploadRoot = path.resolve(process.env.UPLOAD_PATH || './uploads');
          const shortDir = path.join(uploadRoot, 'shorts');
          fs.mkdirSync(shortDir, { recursive: true });
          callback(null, shortDir);
        },
        filename: (_req, file, callback) => {
          const extension = path.extname(file.originalname).toLowerCase();
          callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
        },
      }),
      limits: { fileSize: 150 * 1024 * 1024, files: 2 },
    }),
  ],
  controllers: [ShortController],
  providers: [ShortService],
})
export class ShortModule {}
