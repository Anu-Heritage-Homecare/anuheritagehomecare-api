import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { InvoiceAccountPreviewResult } from '../dto/invoice-wizard.result';
import {
  INVOICE_WIZARD_READ_MODEL,
  InvoiceWizardReadModel,
} from '../ports/invoice-wizard-read.port';

/** Load the Account Details Preview for a chosen billing account (wizard step 1). */
@Injectable()
export class GetInvoiceAccountPreviewUseCase {
  constructor(@Inject(INVOICE_WIZARD_READ_MODEL) private readonly reads: InvoiceWizardReadModel) {}

  async execute(accountId: string): Promise<InvoiceAccountPreviewResult> {
    const view = await this.reads.accountPreview(accountId);
    if (view === null) {
      throw new NotFoundDomainException('Billing account not found');
    }
    return {
      id: view.id,
      accountNumber: `ACC-${view.createdAt.getUTCFullYear()}-${String(view.sequence).padStart(3, '0')}`,
      name: view.name,
      status: view.status,
      primaryContactName: view.primaryContactName,
      primaryContactRelationship: view.primaryContactRelationship,
      contactEmail: view.contactEmail,
      contactPhone: view.contactPhone,
      billingAddress: view.billingAddress,
      outstandingBalanceMinor: view.outstandingBalanceMinor,
      currency: view.currency,
      lastInvoiceNumber:
        view.lastInvoiceSequence === null || view.lastInvoiceIssuedAt === null
          ? null
          : `INV-${view.lastInvoiceIssuedAt.getUTCFullYear()}-${String(view.lastInvoiceSequence).padStart(3, '0')}`,
      lastInvoiceStatus: view.lastInvoiceStatus,
    };
  }
}
