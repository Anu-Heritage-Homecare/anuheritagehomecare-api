import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { TwoFactorConfig } from '@config/configuration';
import { TwoFactorAuthenticator } from '../../application/ports/two-factor-authenticator.port';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const SECRET_BYTES = 20;
const PERIOD_SECONDS = 30;
const DIGITS = 6;
// Accept the current step and one either side, tolerating modest clock drift.
const DRIFT_WINDOW = 1;

/**
 * TOTP (RFC 6238) authenticator backed by Node crypto, so there is no dependency
 * on an external one time password library. Codes are HMAC SHA1 over the current
 * 30 second time step; verification allows one step of drift either side.
 */
@Injectable()
export class TotpAuthenticator implements TwoFactorAuthenticator {
  private readonly issuer: string;

  constructor(config: ConfigService) {
    this.issuer = config.getOrThrow<TwoFactorConfig>('twoFactor').issuer;
  }

  generateSecret(): string {
    return base32Encode(randomBytes(SECRET_BYTES));
  }

  keyUri(secret: string, accountName: string): string {
    const label = encodeURIComponent(`${this.issuer}:${accountName}`);
    const params = new URLSearchParams({
      secret,
      issuer: this.issuer,
      algorithm: 'SHA1',
      digits: String(DIGITS),
      period: String(PERIOD_SECONDS),
    });
    return `otpauth://totp/${label}?${params.toString()}`;
  }

  verify(params: { secret: string; code: string; now: Date }): boolean {
    const submitted = params.code.trim();
    if (!/^\d{6}$/.test(submitted)) {
      return false;
    }
    const key = base32Decode(params.secret);
    const step = Math.floor(params.now.getTime() / 1000 / PERIOD_SECONDS);
    for (let offset = -DRIFT_WINDOW; offset <= DRIFT_WINDOW; offset += 1) {
      const expected = hotp(key, step + offset);
      if (constantTimeEquals(expected, submitted)) {
        return true;
      }
    }
    return false;
  }
}

/** One HMAC based one time password for a counter (RFC 4226 dynamic truncation). */
function hotp(key: Buffer, counter: number): string {
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', key).update(counterBytes).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, '0');
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error('Invalid base32 character in TOTP secret');
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}
