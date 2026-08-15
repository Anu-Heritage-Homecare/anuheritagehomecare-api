import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { KycDocumentType } from './kyc-document-type.enum';
import { KycProvider } from './kyc-provider.enum';
import { KycStatus } from './kyc-status.enum';

interface KycVerificationProps {
  ownerId: string;
  country: string;
  provider: KycProvider;
  documentType: KycDocumentType;
  /** Only a non sensitive remnant (last four) is retained, never the full number. */
  maskedReference: string;
  providerReference: string | null;
  status: KycStatus;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * KYC verification aggregate: one identity verification per family owner. The
 * full document number is never stored; only a masked remnant and the provider's
 * reference. The provider decides the outcome, so the status only moves off
 * pending in response to the provider (synchronously or by webhook).
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
    documentType: KycDocumentType;
    maskedReference: string;
    now: Date;
  }): KycVerification {
    return new KycVerification(params.id, {
      ownerId: params.ownerId,
      country: params.country,
      provider: params.provider,
      documentType: params.documentType,
      maskedReference: params.maskedReference,
      providerReference: null,
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

  public markVerified(now: Date): void {
    this.props.status = KycStatus.Verified;
    this.props.verifiedAt = now;
    this.props.updatedAt = now;
  }

  public markFailed(now: Date): void {
    this.props.status = KycStatus.Failed;
    this.props.updatedAt = now;
  }

  public get isVerified(): boolean {
    return this.props.status === KycStatus.Verified;
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

  public get documentType(): KycDocumentType {
    return this.props.documentType;
  }

  public get maskedReference(): string {
    return this.props.maskedReference;
  }

  public get providerReference(): string | null {
    return this.props.providerReference;
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
