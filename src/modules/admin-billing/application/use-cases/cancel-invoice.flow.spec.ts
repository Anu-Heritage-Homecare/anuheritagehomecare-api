import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  CancelInvoiceOutcome,
  InvoiceCancelRepository,
} from '../../domain/invoice-cancel.repository';
import { InvoiceEventRecorder, RecordInvoiceEvent } from '../../domain/invoice-event.recorder';
import { CancelInvoiceUseCase } from './cancel-invoice.use-case';

function recorder(): InvoiceEventRecorder & { events: RecordInvoiceEvent[] } {
  const events: RecordInvoiceEvent[] = [];
  return {
    events,
    record: (event) => {
      events.push(event);
      return Promise.resolve();
    },
  };
}

function repo(outcome: CancelInvoiceOutcome): InvoiceCancelRepository {
  return { cancelIfPending: () => Promise.resolve(outcome) };
}

describe('CancelInvoiceUseCase', () => {
  it('cancels a pending invoice and logs the reason and notes', async () => {
    const rec = recorder();
    const result = await new CancelInvoiceUseCase(repo('OK'), rec).execute({
      invoiceId: 'inv-1',
      reason: 'Billing Error',
      notes: 'Wrong rate applied',
      adminId: 'admin-7',
    });
    expect(result).toEqual({ id: 'inv-1', status: 'CANCELLED' });
    expect(rec.events).toEqual([
      {
        invoiceId: 'inv-1',
        type: 'CANCELLED',
        detail: 'Billing Error: Wrong rate applied',
        actorType: 'ADMIN',
        actorAdminId: 'admin-7',
      },
    ]);
  });

  it('logs just the reason when there are no notes', async () => {
    const rec = recorder();
    await new CancelInvoiceUseCase(repo('OK'), rec).execute({
      invoiceId: 'inv-1',
      reason: 'Duplicate',
      notes: null,
      adminId: 'admin-7',
    });
    expect(rec.events[0].detail).toBe('Duplicate');
  });

  it('throws when the invoice does not exist, without logging', async () => {
    const rec = recorder();
    await expect(
      new CancelInvoiceUseCase(repo('NOT_FOUND'), rec).execute({
        invoiceId: 'missing',
        reason: 'Billing Error',
        notes: null,
        adminId: 'admin-7',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
    expect(rec.events).toHaveLength(0);
  });

  it('rejects cancelling an invoice that is not pending', async () => {
    const rec = recorder();
    await expect(
      new CancelInvoiceUseCase(repo('NOT_PENDING'), rec).execute({
        invoiceId: 'inv-paid',
        reason: 'Billing Error',
        notes: null,
        adminId: 'admin-7',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(rec.events).toHaveLength(0);
  });
});
