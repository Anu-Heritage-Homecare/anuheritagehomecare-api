import { Clock } from '@shared/application/ports/clock.port';
import { EmailMessage, EmailSender } from '@shared/application/ports/email-sender.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { Currency } from '@shared/domain/currency.enum';
import {
  InvoiceReminderContext,
  InvoiceReminderGateway,
} from '../../domain/invoice-reminder.gateway';
import { RecordInvoiceEvent } from '../../domain/invoice-event.recorder';
import { buildReminderMessage, daysOverdue } from '../invoice-reminder.message';
import { GetInvoiceReminderPreviewUseCase } from './get-invoice-reminder-preview.use-case';
import { SendInvoiceReminderUseCase } from './send-invoice-reminder.use-case';

const NOW = new Date('2026-11-08T00:00:00.000Z');
const clock: Clock = { now: () => NOW };

function context(overrides: Partial<InvoiceReminderContext> = {}): InvoiceReminderContext {
  return {
    invoiceId: 'inv-1',
    invoiceNumber: 'INV-2026-451',
    currency: Currency.NigerianNaira,
    amountDueMinor: 145_000_000,
    dueDate: new Date('2026-11-03T00:00:00.000Z'),
    clientEmail: 'owner@example.com',
    ...overrides,
  };
}

function gateway(value: InvoiceReminderContext | null): InvoiceReminderGateway {
  return { loadReminderContext: () => Promise.resolve(value) };
}

function emailSender(): EmailSender & { sent: EmailMessage[] } {
  const sent: EmailMessage[] = [];
  return {
    sent,
    send: (message) => {
      sent.push(message);
      return Promise.resolve();
    },
  };
}

function recorder(): {
  record: (e: RecordInvoiceEvent) => Promise<void>;
  events: RecordInvoiceEvent[];
} {
  const events: RecordInvoiceEvent[] = [];
  return {
    events,
    record: (e) => {
      events.push(e);
      return Promise.resolve();
    },
  };
}

describe('buildReminderMessage', () => {
  it('composes the overdue reminder with the amount and days', () => {
    const message = buildReminderMessage({
      invoiceNumber: 'INV-2026-451',
      amountDueMinor: 145_000_000,
      currency: Currency.NigerianNaira,
      daysOverdue: 5,
    });
    expect(message.subject).toBe('Payment Reminder: Invoice INV-2026-451');
    expect(message.body).toContain('invoice INV-2026-451');
    expect(message.body).toContain('was due 5 days ago');
  });

  it('uses the singular day and the not yet due phrasing', () => {
    expect(
      buildReminderMessage({
        invoiceNumber: 'INV-2026-1',
        amountDueMinor: 100,
        currency: Currency.UnitedStatesDollar,
        daysOverdue: 1,
      }).body,
    ).toContain('was due 1 day ago');
    expect(
      buildReminderMessage({
        invoiceNumber: 'INV-2026-1',
        amountDueMinor: 100,
        currency: Currency.UnitedStatesDollar,
        daysOverdue: 0,
      }).body,
    ).toContain('is now due');
  });
});

describe('daysOverdue', () => {
  it('counts whole days past the due date, floored at zero', () => {
    expect(daysOverdue(new Date('2026-11-03T00:00:00.000Z'), NOW)).toBe(5);
    expect(daysOverdue(new Date('2026-11-20T00:00:00.000Z'), NOW)).toBe(0);
    expect(daysOverdue(null, NOW)).toBe(0);
  });
});

describe('GetInvoiceReminderPreviewUseCase', () => {
  it('returns the amount due, days overdue and the composed message', async () => {
    const result = await new GetInvoiceReminderPreviewUseCase(gateway(context()), clock).execute(
      'inv-1',
    );
    expect(result).toMatchObject({
      invoiceNumber: 'INV-2026-451',
      amountDueMinor: 145_000_000,
      currency: 'NGN',
      daysOverdue: 5,
      subject: 'Payment Reminder: Invoice INV-2026-451',
    });
  });

  it('throws when the invoice is unknown', async () => {
    await expect(
      new GetInvoiceReminderPreviewUseCase(gateway(null), clock).execute('missing'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('SendInvoiceReminderUseCase', () => {
  it('sends the email and records the channels', async () => {
    const email = emailSender();
    const audit = recorder();
    await new SendInvoiceReminderUseCase(gateway(context()), email, audit, clock).execute({
      invoiceId: 'inv-1',
      adminId: 'admin-3',
      channels: ['EMAIL', 'SMS'],
    });
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]).toMatchObject({
      to: 'owner@example.com',
      subject: 'Payment Reminder: Invoice INV-2026-451',
    });
    expect(audit.events[0]).toMatchObject({
      type: 'REMINDER_SENT',
      detail: 'Payment reminder sent via Email, SMS',
      actorAdminId: 'admin-3',
    });
  });

  it('does not send an email when only SMS is chosen', async () => {
    const email = emailSender();
    const audit = recorder();
    await new SendInvoiceReminderUseCase(gateway(context()), email, audit, clock).execute({
      invoiceId: 'inv-1',
      adminId: 'admin-3',
      channels: ['SMS'],
    });
    expect(email.sent).toHaveLength(0);
    expect(audit.events[0].detail).toBe('Payment reminder sent via SMS');
  });

  it('rejects an email reminder when no address is on file, without recording', async () => {
    const email = emailSender();
    const audit = recorder();
    await expect(
      new SendInvoiceReminderUseCase(
        gateway(context({ clientEmail: null })),
        email,
        audit,
        clock,
      ).execute({ invoiceId: 'inv-1', adminId: 'admin-3', channels: ['EMAIL'] }),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(email.sent).toHaveLength(0);
    expect(audit.events).toHaveLength(0);
  });

  it('rejects an empty channel selection', async () => {
    await expect(
      new SendInvoiceReminderUseCase(gateway(context()), emailSender(), recorder(), clock).execute({
        invoiceId: 'inv-1',
        adminId: 'admin-3',
        channels: [],
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('throws when the invoice is unknown', async () => {
    await expect(
      new SendInvoiceReminderUseCase(gateway(null), emailSender(), recorder(), clock).execute({
        invoiceId: 'missing',
        adminId: 'admin-3',
        channels: ['EMAIL'],
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
