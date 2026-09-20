import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  FAMILY_DIRECTORY_READ_MODEL,
  FamilyDirectoryReadModel,
} from '../ports/family-directory-read.port';
import { FamilyDetailResult } from '../dto/family-directory.result';

/** The Quick Preview drawer detail for one family member. Read only. */
@Injectable()
export class GetFamilyDetailUseCase {
  constructor(
    @Inject(FAMILY_DIRECTORY_READ_MODEL) private readonly reads: FamilyDirectoryReadModel,
  ) {}

  async execute(id: string): Promise<FamilyDetailResult> {
    const detail = await this.reads.detail(id);
    if (detail === null) {
      throw new NotFoundDomainException('Family member not found');
    }
    return {
      id: detail.id,
      reference: detail.reference,
      name: detail.name,
      relationship: detail.relationship,
      hasAccount: detail.hasAccount,
      phone: detail.phone,
      email: detail.email,
      primaryRecipientName: detail.primaryRecipientName,
      linkedRecipientNames: detail.linkedRecipientNames,
      emergencyContactVerified: detail.emergencyContactVerified,
      outstandingBalanceMinor: detail.outstandingBalanceMinor,
      currency: detail.currency,
      billingStatus: detail.billingStatus,
      status: String(detail.status),
      quickNotes: detail.quickNotes,
      lastActivity: detail.lastActivity.toISOString(),
      unreadMessages: detail.unreadMessages,
    };
  }
}
