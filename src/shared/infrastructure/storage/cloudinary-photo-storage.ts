import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PhotoStorageConfig } from '@config/configuration';
import { createHash } from 'node:crypto';
import { PhotoStorage, PhotoUploadTicket } from '@shared/application/ports/photo-storage.port';

const UPLOAD_HOST = 'https://api.cloudinary.com/v1_1';
const DELIVERY_HOST = 'https://res.cloudinary.com';

/**
 * Cloudinary adapter for the PhotoStorage port. A signed upload lets the client
 * push the file straight to Cloudinary using a server issued signature, so the
 * api secret never leaves the server. A delivery URL is signed so a stored key
 * (the Cloudinary public id) can be rendered or downloaded. Fails closed for
 * uploads if the api secret is not configured.
 *
 * NOTE: written against the Cloudinary REST API but not yet verified end to end
 * against a live account.
 */
@Injectable()
export class CloudinaryPhotoStorage implements PhotoStorage {
  private readonly config: PhotoStorageConfig;

  constructor(config: ConfigService) {
    this.config = config.getOrThrow<PhotoStorageConfig>('photoStorage');
  }

  createUploadTicket(params: { reference: string; now: Date }): PhotoUploadTicket {
    if (this.config.apiSecret.length === 0 || this.config.cloudName.length === 0) {
      throw new Error('Cloudinary is not configured (CLOUDINARY_API_SECRET is empty)');
    }
    const publicId = this.keyFor(params.reference);
    const timestamp = Math.floor(params.now.getTime() / 1000).toString();

    // Cloudinary signs the sorted, ampersand joined upload params (excluding the
    // file, api key and cloud name) with the api secret, SHA 1 hex encoded.
    const signature = this.sha1Hex(`public_id=${publicId}&timestamp=${timestamp}`);

    return {
      uploadUrl: `${UPLOAD_HOST}/${this.config.cloudName}/image/upload`,
      fields: {
        api_key: this.config.apiKey,
        timestamp,
        public_id: publicId,
        signature,
      },
      key: publicId,
    };
  }

  urlFor(key: string): string {
    if (this.config.cloudName.length === 0 || key.length === 0) {
      return '';
    }
    // A signed delivery URL so only URLs the server vouches for resolve.
    const signature = this.signedUrlToken(key);
    return `${DELIVERY_HOST}/${this.config.cloudName}/image/upload/s--${signature}--/${key}`;
  }

  async download(key: string): Promise<Buffer> {
    const url = this.urlFor(key);
    if (url.length === 0) {
      throw new Error('Cloudinary is not configured (CLOUDINARY_CLOUD_NAME is empty)');
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download photo ${key} (status ${response.status})`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  private keyFor(reference: string): string {
    const folder = this.config.folder.replace(/\/+$/, '');
    return folder.length === 0 ? reference : `${folder}/${reference}`;
  }

  private sha1Hex(payload: string): string {
    return createHash('sha1')
      .update(payload + this.config.apiSecret)
      .digest('hex');
  }

  private signedUrlToken(key: string): string {
    return createHash('sha1')
      .update(key + this.config.apiSecret)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .slice(0, 8);
  }
}
