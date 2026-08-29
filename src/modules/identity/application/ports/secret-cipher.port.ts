/**
 * Port over authenticated symmetric encryption, used to protect the stored TOTP
 * secret at rest so a database compromise alone does not expose it. The adapter
 * (Node crypto, AES 256 GCM) lives in infrastructure and fails closed when no key
 * is configured.
 */
export interface SecretCipher {
  encrypt(plaintext: string): string;
  decrypt(ciphertext: string): string;
}

export const SECRET_CIPHER = Symbol('SECRET_CIPHER');
