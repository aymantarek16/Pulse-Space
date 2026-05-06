import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
  type FirebaseStorage,
} from 'firebase/storage';
import app, { firebaseConfig, storage as defaultStorage } from './client';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const DEFAULT_UPLOAD_TIMEOUT_MS = 60000;
const DEFAULT_UPLOAD_STALL_TIMEOUT_MS = 10000;
const DEFAULT_INLINE_FILE_MAX_DATA_URL_LENGTH = 850000;

export interface UploadFileOptions {
  onProgress?: (progress: number) => void;
  timeoutMs?: number;
  stallTimeoutMs?: number;
  maxAttempts?: number;
}

interface ImageDataUrlOptions {
  maxDimension?: number;
  maxDataUrlLength?: number;
  quality?: number;
}

interface FileDataUrlOptions {
  maxDataUrlLength?: number;
}

function getExtension(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  return file.type.split('/').pop() || 'bin';
}

function uniqueName(file: File) {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${id}.${getExtension(file)}`;
}

function getStorageInstances() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const buckets = [
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    firebaseConfig.storageBucket,
    projectId ? `${projectId}.appspot.com` : undefined,
    projectId ? `${projectId}.firebasestorage.app` : undefined,
  ].filter((bucket): bucket is string => Boolean(bucket));

  const uniqueBuckets = Array.from(new Set(buckets));

  if (!uniqueBuckets.length) return [defaultStorage];

  return uniqueBuckets.map((bucket) => getStorage(app, `gs://${bucket}`));
}

export function validateImageFile(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) {
    return 'Please choose a JPG, PNG, WEBP, or GIF image.';
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return 'Image must be 5MB or smaller.';
  }

  return null;
}

export function validateUploadFile(file: File, imageOnly = false) {
  if (imageOnly) return validateImageFile(file);

  if (file.size > MAX_FILE_SIZE) {
    return 'File must be 20MB or smaller.';
  }

  return null;
}

export async function uploadFile(
  file: File,
  folder: string,
  options: UploadFileOptions = {}
) {
  const path = `${folder}/${uniqueName(file)}`;
  const stores = getStorageInstances().slice(0, options.maxAttempts ?? undefined);
  const errors: unknown[] = [];

  for (const store of stores) {
    try {
      options.onProgress?.(0);
      return await uploadToStorage(store, path, file, options);
    } catch (error) {
      errors.push(error);
      console.warn('Firebase Storage upload attempt failed:', error);
    }
  }

  throw errors[errors.length - 1] || new Error('Upload failed.');
}

function uploadToStorage(
  store: FirebaseStorage,
  path: string,
  file: File,
  options: UploadFileOptions
) {
  const storageRef = ref(store, path);

  return new Promise<string>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
    });
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let stallTimeoutId: ReturnType<typeof setTimeout> | undefined;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (stallTimeoutId) clearTimeout(stallTimeoutId);
      callback();
    };

    stallTimeoutId = setTimeout(() => {
      uploadTask.cancel();
      finish(() => reject(new Error('Upload stalled before any data was sent.')));
    }, options.stallTimeoutMs ?? DEFAULT_UPLOAD_STALL_TIMEOUT_MS);

    timeoutId = setTimeout(() => {
      uploadTask.cancel();
      finish(() => reject(new Error('Upload timed out. Please try again.')));
    }, options.timeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (!snapshot.totalBytes) return;
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (snapshot.bytesTransferred > 0 && stallTimeoutId) {
          clearTimeout(stallTimeoutId);
          stallTimeoutId = undefined;
        }
        options.onProgress?.(Math.min(progress, 100));
      },
      (error) => {
        finish(() => reject(error));
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          options.onProgress?.(100);
          finish(() => resolve(url));
        } catch (error) {
          finish(() => reject(error));
        }
      }
    );
  });
}

export async function uploadImageFile(
  file: File,
  folder: string,
  options?: UploadFileOptions
) {
  const error = validateImageFile(file);
  if (error) throw new Error(error);
  return uploadFile(file, folder, options);
}

export async function imageFileToDataUrl(
  file: File,
  options: ImageDataUrlOptions = {}
) {
  const error = validateImageFile(file);
  if (error) throw new Error(error);

  const maxDimension = options.maxDimension ?? 960;
  const maxDataUrlLength = options.maxDataUrlLength ?? 750000;
  let quality = options.quality ?? 0.82;
  let dimensionScale = 1;

  const image = await loadImage(file);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const baseScale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const scale = Math.max(0.2, baseScale * dimensionScale);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare image fallback.');

    context.drawImage(image, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);

    if (dataUrl.length <= maxDataUrlLength || attempt === 5) {
      return dataUrl;
    }

    quality = Math.max(0.55, quality - 0.08);
    dimensionScale *= 0.82;
  }

  throw new Error('Could not prepare image fallback.');
}

export async function fileToDataUrl(
  file: File,
  options: FileDataUrlOptions = {}
) {
  const maxDataUrlLength = options.maxDataUrlLength ?? DEFAULT_INLINE_FILE_MAX_DATA_URL_LENGTH;
  const dataUrl = await readFileAsDataUrl(file);

  if (dataUrl.length > maxDataUrlLength) {
    throw new Error('File is too large to send without Firebase Storage.');
  }

  return dataUrl;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read selected image.'));
    };
    image.src = url;
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read selected file.'));
    };
    reader.onerror = () => reject(reader.error || new Error('Could not read selected file.'));
    reader.readAsDataURL(file);
  });
}
