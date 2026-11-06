import { ConfigService } from '@nestjs/config';
import { PhotoStorageConfig } from '@config/configuration';
import { CloudinaryDocumentStorage } from './cloudinary-document-storage';

function storage(overrides: Partial<PhotoStorageConfig> = {}): CloudinaryDocumentStorage {
  const config: PhotoStorageConfig = {
    cloudName: 'demo',
    apiKey: '12345',
    apiSecret: 'secret',
    folder: 'anu',
    ...overrides,
  };
  const configService = { getOrThrow: () => config } as unknown as ConfigService;
  return new CloudinaryDocumentStorage(configService);
}

describe('CloudinaryDocumentStorage', () => {
  const now = new Date('2026-11-12T13:00:00.000Z');

  it('issues a signed raw upload ticket under the documents folder', () => {
    const ticket = storage().createUploadTicket({ reference: 'acc-1/d1', now });

    expect(ticket.uploadUrl).toBe('https://api.cloudinary.com/v1_1/demo/raw/upload');
    expect(ticket.key).toBe('anu/documents/acc-1/d1');
    expect(ticket.fields.public_id).toBe('anu/documents/acc-1/d1');
    expect(ticket.fields.signature).toMatch(/^[a-f0-9]{40}$/);
  });

  it('fails closed for uploads when the secret is not configured', () => {
    expect(() =>
      storage({ apiSecret: '' }).createUploadTicket({ reference: 'acc-1/d1', now }),
    ).toThrow(/not configured/);
  });

  it('builds a signed raw delivery URL for a stored key', () => {
    const url = storage().urlFor('anu/documents/acc-1/d1');
    expect(url).toMatch(
      /^https:\/\/res\.cloudinary\.com\/demo\/raw\/upload\/s--[A-Za-z0-9_-]{8}--\/anu\/documents\/acc-1\/d1$/,
    );
  });

  it('returns an empty URL when the store is not configured', () => {
    expect(storage({ cloudName: '' }).urlFor('anu/documents/acc-1/d1')).toBe('');
    expect(storage().urlFor('')).toBe('');
  });
});
