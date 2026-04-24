import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import multer from 'multer';

import { getEnv } from '../config/env.js';
import { HttpError } from '../errors/http-error.js';

const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(currentDirectory, '..', '..');
const env = getEnv();

export const uploadsRoot = env.UPLOADS_DIR ? path.resolve(env.UPLOADS_DIR) : path.join(backendRoot, 'uploads');
const salonLogosRoot = path.join(uploadsRoot, 'salon-logos');

mkdirSync(salonLogosRoot, { recursive: true });

function getFileExtension(file: Express.Multer.File): string {
  const originalExtension = path.extname(file.originalname).toLowerCase();

  if (originalExtension) {
    return originalExtension;
  }

  switch (file.mimetype) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    default:
      return '';
  }
}

export const salonLogoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, salonLogosRoot);
    },
    filename: (_req, file, callback) => {
      callback(null, `${Date.now()}-${randomUUID()}${getFileExtension(file)}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedImageMimeTypes.has(file.mimetype)) {
      callback(new HttpError(400, 'Only JPG, PNG, and WEBP images are allowed.'));
      return;
    }

    callback(null, true);
  },
});

export function toSalonLogoPublicPath(filename: string): string {
  return `/uploads/salon-logos/${filename}`;
}