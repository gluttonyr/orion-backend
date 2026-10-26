import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { getUploadRoot } from './upload-root';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        // Resolved per upload: a volume mounted after startup can hide the directory created at boot.
        destination: (_req, _file, cb) => {
          const uploadDir = getUploadRoot();
          if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [MulterModule, UploadService],
})
export class UploadModule {}
