import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { OtpGenerator } from '../../application/ports/otp-generator.port';

// Unambiguous alphabet: no 0/O, 1/I/L, so codes are easy to read and type.
const RECOVERY_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * OTP generator backed by Node's cryptographically secure random source.
 * `randomInt` draws uniformly so there is no modulo bias.
 */
@Injectable()
export class CryptoOtpGenerator implements OtpGenerator {
  generateNumeric(length: number): string {
    let code = '';
    for (let i = 0; i < length; i += 1) {
      code += randomInt(0, 10).toString();
    }
    return code;
  }

  generateAlphanumeric(length: number): string {
    let code = '';
    for (let i = 0; i < length; i += 1) {
      code += RECOVERY_ALPHABET[randomInt(0, RECOVERY_ALPHABET.length)];
    }
    return code;
  }
}
