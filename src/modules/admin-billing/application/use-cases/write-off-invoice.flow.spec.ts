import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { InvoiceEventRecorder, RecordInvoiceEvent } from '../../domain/invoice-event.recorder';
import {
  InvoiceWriteOffRepository,
  WriteOffInvoiceOutcome,
} from '../../domain/invoice-writeoff.repository';
import { WriteOffInvoiceUseCase } from './write-off-invoice.use-case';

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

function repo(outcome: WriteOffInvoiceOutcome): InvoiceWriteOffRepository {
  return { writeOffIfOutstanding: () => Promise.resolve(outcome) };
}

describe('WriteOffInvoiceUseCase', () => {
  it('writes off an outstanding invoice and logs the reason and justification', async () => {
    const rec = recorder();
    const result = await new WriteOffInvoiceUseCase(repo('OK'), rec).execute({
      invoiceId: 'inv-1',
      reason: 'Uncollectable Debt',
      justification: 'Approved by finance, ledger ref 2026-0398',
      adminId: 'admin-7',
    });
    expect(result).toEqual({ id: 'inv-1', status: 'WRITTEN_OFF' });
    expect(rec.events).toEqual([
      {
        invoiceId: 'inv-1',
        type: 'WRITTEN_OFF',
        detail: 'Uncollectable Debt: Approved by finance, ledger ref 2026-0398',
        actorType: 'ADMIN',
        actorAdminId: 'admin-7',
      },
    ]);
  });

  it('rejects a blank justification before touching the invoice', async () => {
    const rec = recorder();
    await expect(
      new WriteOffInvoiceUseCase(repo('OK'), rec).execute({
        invoiceId: 'inv-1',
        reason: 'Uncollectable Debt',
        justification: '   ',
        adminId: 'admin-7',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(rec.events).toHaveLength(0);
  });

  it('throws when the invoice does not exist, without logging', async () => {
    const rec = recorder();
    await expect(
      new WriteOffInvoiceUseCase(repo('NOT_FOUND'), rec).execute({
        invoiceId: 'missing',
        reason: 'Uncollectable Debt',
        justification: 'Approved by finance',
        adminId: 'admin-7',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
    expect(rec.events).toHaveLength(0);
  });

  it('rejects writing off an invoice that is not outstanding', async () => {
    const rec = recorder();
    await expect(
      new WriteOffInvoiceUseCase(repo('NOT_OUTSTANDING'), rec).execute({
        invoiceId: 'inv-paid',
        reason: 'Uncollectable Debt',
        justification: 'Approved by finance',
        adminId: 'admin-7',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(rec.events).toHaveLength(0);
  });
});
