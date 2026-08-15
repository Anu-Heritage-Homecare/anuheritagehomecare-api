import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KycConfig } from '@config/configuration';
import { KycDocumentType } from '../../domain/kyc-document-type.enum';
import {
  KycOutcome,
  KycVerificationOutcome,
  KycVerificationRequest,
} from '../../application/ports/kyc-verifier.port';
import { KycProviderGateway } from './kyc-provider-gateway';

interface QoreIdToken {
  accessToken: string;
}

interface QoreIdVerifyResponse {
  id?: string;
  status?: { state?: string; status?: string };
  summary?: { [key: string]: string };
}

/**
 * QoreID KYC adapter (Nigeria). Authenticates with the client credentials, then
 * verifies a NIN or an international passport against the holder's name. Fails
 * closed when unconfigured. NOTE: written against the QoreID API but not yet
 * verified against a live account.
 */
@Injectable()
export class QoreIdKycVerifier implements KycProviderGateway {
  private readonly config: KycConfig;

  constructor(config: ConfigService) {
    this.config = config.getOrThrow<KycConfig>('kyc');
  }

  async verify(request: KycVerificationRequest): Promise<KycVerificationOutcome> {
    if (this.config.qoreIdClientId.length === 0 || this.config.qoreIdSecret.length === 0) {
      throw new Error('QoreID is not configured');
    }

    const token = await this.authenticate();
    const [firstName, ...rest] = request.fullName.split(' ');
    const lastName = rest.join(' ') || firstName;

    const path =
      request.documentType === KycDocumentType.Nin
        ? `/v1/ng/identities/nin/${encodeURIComponent(request.documentValue)}`
        : `/v1/ng/identities/passport/${encodeURIComponent(request.documentValue)}`;

    const response = await fetch(`${this.config.qoreIdBaseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ firstname: firstName, lastname: lastName }),
    });
    if (!response.ok) {
      throw new Error(`QoreID verification failed with status ${response.status}`);
    }

    const result = (await response.json()) as QoreIdVerifyResponse;
    return {
      outcome: QoreIdKycVerifier.toOutcome(result),
      providerReference: result.id ?? null,
    };
  }

  private async authenticate(): Promise<string> {
    const response = await fetch(`${this.config.qoreIdBaseUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: this.config.qoreIdClientId,
        secret: this.config.qoreIdSecret,
      }),
    });
    if (!response.ok) {
      throw new Error(`QoreID authentication failed with status ${response.status}`);
    }
    const token = (await response.json()) as QoreIdToken;
    return token.accessToken;
  }

  private static toOutcome(result: QoreIdVerifyResponse): KycOutcome {
    const state = (result.status?.state ?? result.status?.status ?? '').toLowerCase();
    if (state.includes('verified') || state.includes('exact') || state === 'complete') {
      return 'verified';
    }
    if (state.length === 0) {
      return 'pending';
    }
    return 'failed';
  }
}
