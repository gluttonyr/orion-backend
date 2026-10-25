import * as path from 'path';

export function getUploadRoot(): string {
  return path.resolve(process.env.UPLOAD_ROOT || './uploads');
}
