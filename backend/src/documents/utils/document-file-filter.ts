import { BadRequestException } from '@nestjs/common';

const allowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.dwg',
  'application/acad',
  'image/vnd.dwg',
];

export function documentFileFilter(
  _req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(
      new BadRequestException('File type is not allowed'),
      false,
    );
  }

  callback(null, true);
}