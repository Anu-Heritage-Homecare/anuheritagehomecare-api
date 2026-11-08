import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  DeleteDraftInvoiceOutcome,
  InvoiceDeleteRepository,
} from '../../domain/invoice-delete.repository';
import { DeleteDraftInvoiceUseCase } from './delete-draft-invoice.use-case';

function repo(outcome: DeleteDraftInvoiceOutcome): InvoiceDeleteRepository & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    deleteIfDraft: (id) => {
      calls.push(id);
      return Promise.resolve(outcome);
    },
  };
}

describe('DeleteDraftInvoiceUseCase', () => {
  it('deletes a draft invoice', async () => {
    const r = repo('OK');
    await expect(
      new DeleteDraftInvoiceUseCase(r).execute({ invoiceId: 'inv-1' }),
    ).resolves.toBeUndefined();
    expect(r.calls).toEqual(['inv-1']);
  });

  it('throws when the invoice does not exist', async () => {
    await expect(
      new DeleteDraftInvoiceUseCase(repo('NOT_FOUND')).execute({ invoiceId: 'missing' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('refuses to delete a sent invoice', async () => {
    await expect(
      new DeleteDraftInvoiceUseCase(repo('SENT')).execute({ invoiceId: 'inv-1' }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('refuses to delete an invoice with payments', async () => {
    await expect(
      new DeleteDraftInvoiceUseCase(repo('HAS_PAYMENTS')).execute({ invoiceId: 'inv-1' }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('refuses to delete a non pending invoice', async () => {
    await expect(
      new DeleteDraftInvoiceUseCase(repo('NOT_PENDING')).execute({ invoiceId: 'inv-1' }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
