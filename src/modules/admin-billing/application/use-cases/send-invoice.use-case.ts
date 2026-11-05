import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { EMAIL_SENDER, EmailSender } from '@shared/application/ports/email-sender.port';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { InvoiceSentResult } from '../dto/invoice-sent.result';
import {
  INVOICE_SEND_REPOSITORY,
  InvoiceSendRepository,
} from '../../domain/invoice-send.repository';

export interface SendInvoiceCommand {
  invoiceId: string;
}

/** Email a raised invoice to the billing client and stamp its delivery (wizard step 6). */
@Injectable()
export class SendInvoiceUseCase {
  constructor(
    @Inject(INVOICE_SEND_REPOSITORY) private readonly invoices: InvoiceSendRepository,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SendInvoiceCommand): Promise<InvoiceSentResult> {
    const target = await this.invoices.loadForSend(command.invoiceId);
    if (target === null) {
      throw new NotFoundDomainException('Invoice not found');
    }
    if (target.clientEmail === null || target.clientEmail.length === 0) {
      throw new ValidationException('The billing client has no email address on file');
    }

    const invoiceNumber = `INV-${target.issuedAt.getUTCFullYear()}-${String(target.sequence).padStart(3, '0')}`;
    const amount = formatMoney(target.amountMinor, target.currency);
    const due = target.dueDate !== null ? target.dueDate.toISOString().slice(0, 10) : 'on receipt';

    await this.email.send({
      to: target.clientEmail,
      subject: `Invoice ${invoiceNumber} from Anu Heritage Homecare`,
      text:
        `Dear ${target.clientName},\n\n` +
        `Please find your invoice ${invoiceNumber} for ${amount}, due ${due}.\n\n` +
        `Thank you for trusting us with your family's care.\n\n` +
        `Anu Heritage Homecare`,
    });

    const sentAt = this.clock.now();
    await this.invoices.markSent(target.invoiceId, sentAt);

    return {
      invoiceNumber,
      sentTo: maskEmail(target.clientEmail),
      sentAt: sentAt.toISOString(),
    };
  }
}

/** Human readable amount from integer minor units, with the market currency symbol. */
function formatMoney(amountMinor: number, currency: Currency): string {
  const locale = currency === Currency.NigerianNaira ? 'en-NG' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amountMinor / 100);
}

/** Keep the first character and domain, redact the rest: never echo a full client address. */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (domain === undefined || local.length === 0) {
    return '***';
  }
  const head = local.slice(0, 1);
  return `${head}${'*'.repeat(Math.max(1, local.length - 1))}@${domain}`;
}
