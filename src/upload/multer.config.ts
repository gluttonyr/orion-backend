import { diskStorage } from 'multer';
import { UploadService } from './upload.service';

export const multerConfig = (uploadService: UploadService) => ({
  storage: diskStorage({
    destination: uploadService.getBaseUploadPath(),
    filename: (req, file, cb) => {
      const filename = uploadService.generateFileName(file);
      cb(null, filename);
    },
  }),
});