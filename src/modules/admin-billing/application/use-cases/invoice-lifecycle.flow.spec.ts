import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { InvoiceAttachmentRepository } from '../../domain/invoice-attachment.repository';
import { RecordInvoiceEvent } from '../../domain/invoice-event.recorder';
import { ApproveInvoiceUseCase } from './approve-invoice.use-case';
import { SendInvoiceReminderUseCase } from './send-invoice-reminder.use-case';

function invoices(present: boolean): InvoiceAttachmentRepository {
  return {
    add: () => Promise.resolve(),
    listByInvoice: () => Promise.resolve([]),
    findById: () => Promise.resolve(null),
    remove: () => Promise.resolve(),
    invoiceExists: () => Promise.resolve(present),
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

describe('ApproveInvoiceUseCase', () => {
  it('logs an APPROVED event attributed to the admin', async () => {
    const audit = recorder();
    await new ApproveInvoiceUseCase(invoices(true), audit).execute({
      invoiceId: 'inv-1',
      adminId: 'admin-3',
    });
    expect(audit.events[0]).toMatchObject({
      invoiceId: 'inv-1',
      type: 'APPROVED',
      actorType: 'ADMIN',
      actorAdminId: 'admin-3',
    });
  });

  it('throws when the invoice is missing', async () => {
    await expect(
      new ApproveInvoiceUseCase(invoices(false), recorder()).execute({
        invoiceId: 'inv-1',
        adminId: 'admin-3',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('SendInvoiceReminderUseCase', () => {
  it('logs a REMINDER_SENT event', async () => {
    const audit = recorder();
    await new SendInvoiceReminderUseCase(invoices(true), audit).execute({
      invoiceId: 'inv-1',
      adminId: 'admin-3',
    });
    expect(audit.events[0]).toMatchObject({ type: 'REMINDER_SENT', actorType: 'ADMIN' });
  });

  it('throws when the invoice is missing', async () => {
    await expect(
      new SendInvoiceReminderUseCase(invoices(false), recorder()).execute({
        invoiceId: 'inv-1',
        adminId: 'admin-3',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
