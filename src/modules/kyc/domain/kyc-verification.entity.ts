import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { FaceMatchOutcome } from './face-match-outcome.enum';
import { ClaimedIdentity, IdentityMismatch } from './identity-matcher';
import { KycDocumentType } from './kyc-document-type.enum';
import { KycProvider } from './kyc-provider.enum';
import { KycStatus } from './kyc-status.enum';

interface KycVerificationProps {
  ownerId: string;
  country: string;
  provider: KycProvider;
  documentType: KycDocumentType | null;
  claimedFirstName: string;
  claimedLastName: string;
  claimedDateOfBirth: Date;
  /** Only a non sensitive remnant (last four) is retained, never the full number. */
  maskedReference: string | null;
  providerReference: string | null;
  faceMatch: FaceMatchOutcome | null;
  /** Fields that did not match the provider record, kept for the admin audit. */
  mismatches: IdentityMismatch[];
  status: KycStatus;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * KYC verification aggregate: one identity verification per family owner. The
 * full document number and the live selfie are never stored; only a masked
 * remnant, the provider reference, the face match outcome, and any field level
 * mismatches (for audit). The provider supplies the identity data and the face
 * result; this aggregate records the decision: VERIFIED when everything matched,
 * REJECTED when the person is real but their details or face did not match, or
 * FAILED when the provider could not verify at all.
 */
export class KycVerification extends AggregateRoot<string> {
  private props: KycVerificationProps;

  private constructor(id: string, props: KycVerificationProps) {
    super(id);
    this.props = props;
  }

  public static start(params: {
    id: string;
    ownerId: string;
    country: string;
    provider: KycProvider;
    documentType: KycDocumentType | null;
    claimed: ClaimedIdentity;
    now: Date;
  }): KycVerification {
    return new KycVerification(params.id, {
      ownerId: params.ownerId,
      country: params.country,
      provider: params.provider,
      documentType: params.documentType,
      claimedFirstName: params.claimed.firstName,
      claimedLastName: params.claimed.lastName,
      claimedDateOfBirth: params.claimed.dateOfBirth,
      maskedReference: null,
      providerReference: null,
      faceMatch: null,
      mismatches: [],
      status: KycStatus.Pending,
      verifiedAt: null,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: KycVerificationProps): KycVerification {
    return new KycVerification(id, props);
  }

  public recordProviderReference(reference: string): void {
    this.props.providerReference = reference;
  }

  /** Record the document the provider actually verified (type and masked number). */
  public recordVerifiedDocument(
    documentType: KycDocumentType | null,
    maskedReference: string | null,
  ): void {
    if (documentType !== null) {
      this.props.documentType = documentType;
    }
    if (maskedReference !== null) {
      this.props.maskedReference = maskedReference;
    }
  }

  /** The identity is real and the details and face matched. */
  public markVerified(now: Date, faceMatch: FaceMatchOutcome): void {
    this.props.status = KycStatus.Verified;
    this.props.faceMatch = faceMatch;
    this.props.mismatches = [];
    this.props.verifiedAt = now;
    this.props.updatedAt = now;
  }

  /** The identity is real but the owner's details or face did not match it. */
  public markRejected(
    now: Date,
    mismatches: IdentityMismatch[],
    faceMatch: FaceMatchOutcome,
  ): void {
    this.props.status = KycStatus.Rejected;
    this.props.mismatches = [...mismatches];
    this.props.faceMatch = faceMatch;
    this.props.verifiedAt = null;
    this.props.updatedAt = now;
  }

  /** The provider could not verify the document at all. */
  public markFailed(now: Date): void {
    this.props.status = KycStatus.Failed;
    this.props.updatedAt = now;
  }

  public get isVerified(): boolean {
    return this.props.status === KycStatus.Verified;
  }

  public get claimedIdentity(): ClaimedIdentity {
    return {
      firstName: this.props.claimedFirstName,
      lastName: this.props.claimedLastName,
      dateOfBirth: this.props.claimedDateOfBirth,
    };
  }

  public get ownerId(): string {
    return this.props.ownerId;
  }

  public get country(): string {
    return this.props.country;
  }

  public get provider(): KycProvider {
    return this.props.provider;
  }

  public get documentType(): KycDocumentType | null {
    return this.props.documentType;
  }

  public get claimedFirstName(): string {
    return this.props.claimedFirstName;
  }

  public get claimedLastName(): string {
    return this.props.claimedLastName;
  }

  public get claimedDateOfBirth(): Date {
    return this.props.claimedDateOfBirth;
  }

  public get maskedReference(): string | null {
    return this.props.maskedReference;
  }

  public get providerReference(): string | null {
    return this.props.providerReference;
  }

  public get faceMatch(): FaceMatchOutcome | null {
    return this.props.faceMatch;
  }

  public get mismatches(): IdentityMismatch[] {
    return [...this.props.mismatches];
  }

  public get status(): KycStatus {
    return this.props.status;
  }

  public get verifiedAt(): Date | null {
    return this.props.verifiedAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
