import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KycConfig } from '@config/configuration';
import { FaceMatchOutcome } from '../../domain/face-match-outcome.enum';
import { ProviderIdentity } from '../../domain/identity-matcher';
import { KycDocumentType } from '../../domain/kyc-document-type.enum';
import {
  KycVerificationOutcome,
  KycVerificationRequest,
} from '../../application/ports/kyc-verifier.port';
import { KycProviderGateway } from './kyc-provider-gateway';

interface QoreIdToken {
  accessToken: string;
}

interface QoreIdIdentityData {
  firstname?: string;
  lastname?: string;
  birthdate?: string;
}

interface QoreIdVerifyResponse {
  id?: string;
  status?: { state?: string; status?: string };
  nin?: QoreIdIdentityData;
  drivers_license?: QoreIdIdentityData;
  passport?: QoreIdIdentityData;
  face_verification?: { match?: boolean; confidence?: number };
}

const DOCUMENT_PATHS: Record<KycDocumentType, string> = {
  [KycDocumentType.Nin]: 'nin',
  [KycDocumentType.DriversLicense]: 'drivers-license',
  [KycDocumentType.Passport]: 'passport',
};

/**
 * QoreID KYC adapter (Nigeria). Authenticates with the client credentials, then
 * verifies a NIN, driver's licence or international passport, returning the
 * holder's registered identity and, when a live selfie is supplied, QoreID's face
 * match result. The application layer compares the returned identity against the
 * claimed details and decides the outcome. Fails closed when unconfigured. NOTE:
 * written against the QoreID API but not yet verified against a live account.
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
    const documentType = request.documentType ?? KycDocumentType.Nin;
    const idNumber = request.idNumber ?? '';

    const token = await this.authenticate();
    const segment = DOCUMENT_PATHS[documentType];
    const path = `/v1/ng/identities/${segment}/${encodeURIComponent(idNumber)}`;

    const response = await fetch(`${this.config.qoreIdBaseUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstname: request.claimed.firstName,
        lastname: request.claimed.lastName,
        photo: request.faceImageBase64 ?? undefined,
      }),
    });

    if (response.status === 404) {
      return { state: 'not_found', providerReference: null };
    }
    if (!response.ok) {
      throw new Error(`QoreID verification failed with status ${response.status}`);
    }

    const result = (await response.json()) as QoreIdVerifyResponse;
    const data = result.nin ?? result.drivers_license ?? result.passport ?? {};

    return {
      state: 'completed',
      providerReference: result.id ?? null,
      identity: QoreIdKycVerifier.toIdentity(data),
      faceMatch: QoreIdKycVerifier.toFaceMatch(result, request.faceImageBase64),
      documentType,
      maskedReference: idNumber.length >= 4 ? idNumber.slice(-4) : null,
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

  private static toIdentity(data: QoreIdIdentityData): ProviderIdentity {
    const dateOfBirth =
      data.birthdate !== undefined && !Number.isNaN(new Date(data.birthdate).getTime())
        ? new Date(data.birthdate)
        : null;
    return {
      firstName: data.firstname ?? null,
      lastName: data.lastname ?? null,
      dateOfBirth,
    };
  }

  private static toFaceMatch(
    result: QoreIdVerifyResponse,
    faceImage: string | null | undefined,
  ): FaceMatchOutcome {
    if (faceImage === null || faceImage === undefined || faceImage.length === 0) {
      return FaceMatchOutcome.NotAvailable;
    }
    const face = result.face_verification;
    if (face === undefined || face.match === undefined) {
      return FaceMatchOutcome.NotAvailable;
    }
    return face.match ? FaceMatchOutcome.Match : FaceMatchOutcome.NoMatch;
  }
}
