import { ConfigService } from '@nestjs/config';
import { AesGcmSecretCipher } from './aes-gcm-secret-cipher';

function build(): AesGcmSecretCipher {
  const config = {
    getOrThrow: () => ({ encryptionKey: 'a-strong-key-of-at-least-32-characters', issuer: 'x' }),
  } as unknown as ConfigService;
  return new AesGcmSecretCipher(config);
}

describe('AesGcmSecretCipher', () => {
  it('round trips a value through encrypt and decrypt', () => {
    const cipher = build();
    const secret = 'JBSWY3DPEHPK3PXP';

    const encrypted = cipher.encrypt(secret);

    expect(encrypted).not.toBe(secret);
    expect(cipher.decrypt(encrypted)).toBe(secret);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const cipher = build();
    expect(cipher.encrypt('same')).not.toBe(cipher.encrypt('same'));
  });

  it('rejects a tampered ciphertext', () => {
    const cipher = build();
    const encrypted = cipher.encrypt('JBSWY3DPEHPK3PXP');
    const tampered = `${encrypted.slice(0, -2)}00`;

    expect(() => cipher.decrypt(tampered)).toThrow();
  });
});
