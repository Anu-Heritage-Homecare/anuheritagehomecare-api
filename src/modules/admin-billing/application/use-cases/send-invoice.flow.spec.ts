import { Clock } from '@shared/application/ports/clock.port';
import { EmailMessage, EmailSender } from '@shared/application/ports/email-sender.port';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { InvoiceSendRepository, InvoiceSendTarget } from '../../domain/invoice-send.repository';
import { SendInvoiceUseCase } from './send-invoice.use-case';

const NOW = new Date('2026-08-01T09:00:00.000Z');
const clock: Clock = { now: () => NOW };

const TARGET: InvoiceSendTarget = {
  invoiceId: 'inv1',
  sequence: 458,
  issuedAt: new Date('2026-07-31T00:00:00.000Z'),
  amountMinor: 148_081_300,
  currency: Currency.NigerianNaira,
  dueDate: new Date('2026-08-30T00:00:00.000Z'),
  accountName: 'Adeyemi Family Account',
  clientName: 'Tunde Adeyemi',
  clientEmail: 'tunde@example.com',
};

class FakeRepo implements InvoiceSendRepository {
  marked: { invoiceId: string; sentAt: Date } | null = null;
  constructor(private readonly target: InvoiceSendTarget | null) {}
  loadForSend(): Promise<InvoiceSendTarget | null> {
    return Promise.resolve(this.target);
  }
  markSent(invoiceId: string, sentAt: Date): Promise<void> {
    this.marked = { invoiceId, sentAt };
    return Promise.resolve();
  }
}

class FakeEmail implements EmailSender {
  sent: EmailMessage | null = null;
  send(message: EmailMessage): Promise<void> {
    this.sent = message;
    return Promise.resolve();
  }
}

describe('SendInvoiceUseCase', () => {
  it('emails the client, stamps delivery and returns a masked confirmation', async () => {
    const repo = new FakeRepo(TARGET);
    const email = new FakeEmail();
    const result = await new SendInvoiceUseCase(
      repo,
      email,
      { record: () => Promise.resolve() },
      clock,
    ).execute({ invoiceId: 'inv1', adminId: 'admin-1' });

    expect(result.invoiceNumber).toBe('INV-2026-458');
    expect(result.sentTo).toBe('t****@example.com');
    expect(result.sentAt).toBe('2026-08-01T09:00:00.000Z');

    expect(email.sent?.to).toBe('tunde@example.com');
    expect(email.sent?.subject).toContain('INV-2026-458');
    expect(email.sent?.text).toContain('Tunde Adeyemi');
    expect(email.sent?.text).toContain('2026-08-30');
    // Nigerian naira, minor units to major with the market symbol.
    expect(email.sent?.text).toContain('₦1,480,813.00');

    expect(repo.marked).toEqual({ invoiceId: 'inv1', sentAt: NOW });
  });

  it('throws when the invoice does not exist', async () => {
    await expect(
      new SendInvoiceUseCase(
        new FakeRepo(null),
        new FakeEmail(),
        { record: () => Promise.resolve() },
        clock,
      ).execute({ invoiceId: 'missing', adminId: 'admin-1' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('rejects sending when the client has no email on file', async () => {
    const repo = new FakeRepo({ ...TARGET, clientEmail: null });
    const email = new FakeEmail();
    await expect(
      new SendInvoiceUseCase(repo, email, { record: () => Promise.resolve() }, clock).execute({
        invoiceId: 'inv1',
        adminId: 'admin-1',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(email.sent).toBeNull();
    expect(repo.marked).toBeNull();
  });
});
