import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { InvoiceLine } from '@modules/recipient-billing/domain/invoice-line.entity';
import { Invoice } from '@modules/recipient-billing/domain/invoice.entity';
import {
  INVOICE_REPOSITORY,
  InvoiceRepository,
} from '@modules/recipient-billing/domain/invoice.repository';
import { currencyForCountryCode } from '@shared/domain/currency.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';

export interface CreateInvoiceCommand {
  recipientId: string;
  periodStart: Date;
  periodEnd: Date;
  servicesLabel: string;
  insuranceCoveredMinor: number;
  dueDate?: Date | null;
  lines: { serviceName: string; amountMinor: number }[];
}

/**
 * Use case: the admin issues an invoice for a recipient over a billing period. The
 * currency is derived server side from the owner's country so it always matches the
 * market; the amount is the sum of the service lines.
 */
@Injectable()
export class CreateInvoiceUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreateInvoiceCommand): Promise<{ id: string }> {
    const recipient = await this.recipients.findById(command.recipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }
    const owner = await this.users.findById(recipient.ownerId);
    if (owner === null) {
      throw new ValidationException('The care recipient has no owner to bill');
    }
    const currency = currencyForCountryCode(String(owner.address.country));

    const invoice = Invoice.issue({
      id: this.ids.generate(),
      careRecipientId: command.recipientId,
      periodStart: command.periodStart,
      periodEnd: command.periodEnd,
      servicesLabel: command.servicesLabel,
      currency,
      insuranceCoveredMinor: command.insuranceCoveredMinor,
      dueDate: command.dueDate,
      lines: command.lines.map((line) =>
        InvoiceLine.create({
          id: this.ids.generate(),
          serviceName: line.serviceName,
          amountMinor: line.amountMinor,
        }),
      ),
      now: this.clock.now(),
    });
    await this.invoices.add(invoice);
    return { id: invoice.id };
  }
}
