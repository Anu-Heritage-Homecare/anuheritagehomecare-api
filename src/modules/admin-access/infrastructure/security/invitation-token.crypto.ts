import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InvitationTokenService } from '../../application/ports/invitation-token.service';

/**
 * Invitation token service backed by Node crypto. The raw token is 32 random
 * bytes (URL safe base64); only its SHA 256 hash is stored, so the stored hash
 * cannot be reversed into a usable token.
 */
@Injectable()
export class CryptoInvitationTokenService implements InvitationTokenService {
  generate(): { token: string; tokenHash: string } {
    const token = randomBytes(32).toString('base64url');
    return { token, tokenHash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
