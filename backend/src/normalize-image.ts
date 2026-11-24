import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

export async function normalizeImage(input: Buffer) {
  try {
    const image = sharp(input, { limitInputPixels: 40000000, failOn: 'warning' });
    const metadata = await image.metadata();
    if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)
      || !metadata.width || !metadata.height || metadata.width * metadata.height > 40000000
      || (metadata.pages ?? 1) > 1) throw new Error('Unsupported image.');
    const { data, info } = await image.rotate()
      .resize({ width: 4096, height: 4096, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    throw new BadRequestException('圖片必須為可解碼的 JPEG、PNG 或 WebP，且不超過 40MP；不接受動畫。');
  }
}
