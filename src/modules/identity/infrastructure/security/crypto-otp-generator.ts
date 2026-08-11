import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { OtpGenerator } from '../../application/ports/otp-generator.port';

/**
 * OTP generator backed by Node's cryptographically secure random source.
 * `randomInt` draws uniformly from [0, 10) so there is no modulo bias.
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
}
