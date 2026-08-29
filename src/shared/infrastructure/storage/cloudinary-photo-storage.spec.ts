import { ConfigService } from '@nestjs/config';
import { PhotoStorageConfig } from '@config/configuration';
import { CloudinaryPhotoStorage } from './cloudinary-photo-storage';

function storage(overrides: Partial<PhotoStorageConfig> = {}): CloudinaryPhotoStorage {
  const config: PhotoStorageConfig = {
    cloudName: 'demo',
    apiKey: '12345',
    apiSecret: 'secret',
    folder: 'anu/visits',
    ...overrides,
  };
  const configService = { getOrThrow: () => config } as unknown as ConfigService;
  return new CloudinaryPhotoStorage(configService);
}

describe('CloudinaryPhotoStorage', () => {
  const now = new Date('2026-11-12T13:00:00.000Z');

  it('issues a signed upload ticket namespaced under the folder', () => {
    const ticket = storage().createUploadTicket({ reference: 'v1/abc', now });

    expect(ticket.uploadUrl).toBe('https://api.cloudinary.com/v1_1/demo/image/upload');
    expect(ticket.key).toBe('anu/visits/v1/abc');
    expect(ticket.fields.public_id).toBe('anu/visits/v1/abc');
    expect(ticket.fields.api_key).toBe('12345');
    expect(ticket.fields.timestamp).toBe('1794488400');
    // Signature is deterministic for the same params and secret.
    expect(ticket.fields.signature).toMatch(/^[a-f0-9]{40}$/);
    expect(ticket.fields.signature).toBe(
      storage().createUploadTicket({ reference: 'v1/abc', now }).fields.signature,
    );
  });

  it('fails closed for uploads when the secret is not configured', () => {
    expect(() =>
      storage({ apiSecret: '' }).createUploadTicket({ reference: 'v1/abc', now }),
    ).toThrow(/not configured/);
  });

  it('builds a signed delivery URL for a stored key', () => {
    const url = storage().urlFor('anu/visits/v1/abc');
    expect(url).toMatch(
      /^https:\/\/res\.cloudinary\.com\/demo\/image\/upload\/s--[A-Za-z0-9_-]{8}--\/anu\/visits\/v1\/abc$/,
    );
  });

  it('returns an empty URL when the store is not configured', () => {
    expect(storage({ cloudName: '' }).urlFor('anu/visits/v1/abc')).toBe('');
    expect(storage().urlFor('')).toBe('');
  });

  it('downloads the bytes of a stored key from its signed URL', async () => {
    const bytes = Uint8Array.from([1, 2, 3, 4]);
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(bytes.buffer) });
    const original = global.fetch;
    global.fetch = fetchMock;
    try {
      const data = await storage().download('anu/visits/v1/abc');
      expect(fetchMock).toHaveBeenCalledWith(storage().urlFor('anu/visits/v1/abc'));
      expect([...data]).toEqual([1, 2, 3, 4]);
    } finally {
      global.fetch = original;
    }
  });

  it('fails closed on download when the store is not configured', async () => {
    await expect(storage({ cloudName: '' }).download('anu/visits/v1/abc')).rejects.toThrow(
      /not configured/,
    );
  });
});
