import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { TwoFactorConfig } from '@config/configuration';
import { SecretCipher } from '../../application/ports/secret-cipher.port';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

/**
 * Authenticated symmetric encryption over AES 256 GCM, used to protect the TOTP
 * secret at rest. The 256 bit key is derived from the configured encryption key
 * so any sufficiently long passphrase works. The stored value packs the random
 * IV, the auth tag and the ciphertext into one base64 string.
 */
@Injectable()
export class AesGcmSecretCipher implements SecretCipher {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const configured = config.getOrThrow<TwoFactorConfig>('twoFactor').encryptionKey;
    // Fold whatever length key was supplied into exactly 32 bytes.
    this.key = createHash('sha256').update(configured).digest();
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(ciphertext: string): string {
    const packed = Buffer.from(ciphertext, 'base64');
    const iv = packed.subarray(0, IV_BYTES);
    const authTag = packed.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
    const encrypted = packed.subarray(IV_BYTES + AUTH_TAG_BYTES);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }
}
