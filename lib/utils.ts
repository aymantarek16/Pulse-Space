import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getExternalUrl(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (
    /^data:(image\/(jpeg|jpg|png|webp|gif)|audio\/(mpeg|mp3|mp4|ogg|wav|webm|x-m4a)|application\/(pdf|zip|x-zip-compressed|x-rar-compressed|vnd\.rar|x-7z-compressed|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|octet-stream)|text\/(plain|csv));base64,/i.test(trimmed)
  ) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function isExternalUrl(value?: string | null): boolean {
  return getExternalUrl(value) !== null;
}
