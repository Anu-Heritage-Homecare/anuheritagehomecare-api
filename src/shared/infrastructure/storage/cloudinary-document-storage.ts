import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PhotoStorageConfig } from '@config/configuration';
import { createHash } from 'node:crypto';
import {
  DocumentStorage,
  DocumentUploadTicket,
} from '@shared/application/ports/document-storage.port';

const UPLOAD_HOST = 'https://api.cloudinary.com/v1_1';
const DELIVERY_HOST = 'https://res.cloudinary.com';

/**
 * Cloudinary adapter for the DocumentStorage port, using the `raw` resource type
 * so arbitrary files (PDFs) are stored and delivered unchanged. Reuses the same
 * Cloudinary credentials as photos, namespaced under a documents subfolder. A
 * signed upload keeps the api secret on the server; a signed delivery URL gates
 * reads. Fails closed for uploads if the api secret is not configured.
 *
 * NOTE: written against the Cloudinary REST API but not yet verified end to end
 * against a live account.
 */
@Injectable()
export class CloudinaryDocumentStorage implements DocumentStorage {
  private readonly config: PhotoStorageConfig;

  constructor(config: ConfigService) {
    this.config = config.getOrThrow<PhotoStorageConfig>('photoStorage');
  }

  createUploadTicket(params: { reference: string; now: Date }): DocumentUploadTicket {
    if (this.config.apiSecret.length === 0 || this.config.cloudName.length === 0) {
      throw new Error('Cloudinary is not configured (CLOUDINARY_API_SECRET is empty)');
    }
    const publicId = this.keyFor(params.reference);
    const timestamp = Math.floor(params.now.getTime() / 1000).toString();
    const signature = this.sha1Hex(`public_id=${publicId}&timestamp=${timestamp}`);

    return {
      uploadUrl: `${UPLOAD_HOST}/${this.config.cloudName}/raw/upload`,
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
    const signature = this.signedUrlToken(key);
    return `${DELIVERY_HOST}/${this.config.cloudName}/raw/upload/s--${signature}--/${key}`;
  }

  private keyFor(reference: string): string {
    const base = this.config.folder.replace(/\/+$/, '');
    const folder = base.length === 0 ? 'documents' : `${base}/documents`;
    return `${folder}/${reference}`;
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
