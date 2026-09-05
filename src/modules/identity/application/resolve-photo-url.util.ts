import { PhotoStorage } from '@shared/application/ports/photo-storage.port';

/**
 * Resolve a signed delivery URL for a stored avatar key, or null when there is no
 * key or the store is not configured (urlFor returns an empty string).
 */
export function resolvePhotoUrl(photos: PhotoStorage, photoKey: string | null): string | null {
  if (photoKey === null) {
    return null;
  }
  const url = photos.urlFor(photoKey);
  return url.length === 0 ? null : url;
}
