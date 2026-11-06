import { DocumentStorage } from '@shared/application/ports/document-storage.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { InvoiceAttachment } from '../../domain/invoice-attachment.entity';
import { InvoiceAttachmentRepository } from '../../domain/invoice-attachment.repository';
import { CreateInvoiceAttachmentTicketUseCase } from './create-invoice-attachment-ticket.use-case';
import { ListInvoiceAttachmentsUseCase } from './list-invoice-attachments.use-case';
import { RegisterInvoiceAttachmentUseCase } from './register-invoice-attachment.use-case';

const NOW = new Date('2026-11-06T10:00:00.000Z');
const clock = { now: () => NOW };
let counter = 0;
const ids = { generate: () => `att-${(counter += 1)}` };

function store(
  present: boolean,
  initial: InvoiceAttachment[] = [],
): InvoiceAttachmentRepository & { items: InvoiceAttachment[] } {
  const items = [...initial];
  return {
    items,
    add: (attachment) => {
      items.push(attachment);
      return Promise.resolve();
    },
    listByInvoice: (invoiceId) => Promise.resolve(items.filter((a) => a.invoiceId === invoiceId)),
    invoiceExists: () => Promise.resolve(present),
  };
}

const storage: DocumentStorage = {
  createUploadTicket: ({ reference }) => ({
    uploadUrl: 'https://upload',
    fields: { public_id: reference },
    key: reference,
  }),
  urlFor: (key) => `https://cdn/${key}`,
};

describe('CreateInvoiceAttachmentTicketUseCase', () => {
  it('issues a ticket keyed under the invoice', async () => {
    counter = 0;
    const ticket = await new CreateInvoiceAttachmentTicketUseCase(
      store(true),
      storage,
      ids,
      clock,
    ).execute({ invoiceId: 'inv-1' });
    expect(ticket.key).toBe('invoices/inv-1/att-1');
  });

  it('throws when the invoice is missing', async () => {
    await expect(
      new CreateInvoiceAttachmentTicketUseCase(store(false), storage, ids, clock).execute({
        invoiceId: 'inv-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('RegisterInvoiceAttachmentUseCase', () => {
  const command = {
    invoiceId: 'inv-1',
    title: 'Signed Agreement',
    fileName: 'agreement.pdf',
    storageKey: 'invoices/inv-1/att-1',
    sizeBytes: 180_244,
    adminId: 'admin-3',
  };

  it('records the attachment against the invoice', async () => {
    counter = 0;
    const repo = store(true);
    const result = await new RegisterInvoiceAttachmentUseCase(repo, ids, clock).execute(command);
    expect(result.id).toBe('att-1');
    expect(repo.items[0].title).toBe('Signed Agreement');
    expect(repo.items[0].uploadedByAdminId).toBe('admin-3');
  });

  it('rejects a non positive file size', async () => {
    await expect(
      new RegisterInvoiceAttachmentUseCase(store(true), ids, clock).execute({
        ...command,
        sizeBytes: 0,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('throws when the invoice is missing', async () => {
    await expect(
      new RegisterInvoiceAttachmentUseCase(store(false), ids, clock).execute(command),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('ListInvoiceAttachmentsUseCase', () => {
  it('lists the invoice attachments with a signed URL', async () => {
    const attachment = InvoiceAttachment.register({
      id: 'att-1',
      invoiceId: 'inv-1',
      title: 'Signed Agreement',
      fileName: 'agreement.pdf',
      storageKey: 'invoices/inv-1/att-1',
      sizeBytes: 180_244,
      now: NOW,
    });
    const result = await new ListInvoiceAttachmentsUseCase(
      store(true, [attachment]),
      storage,
    ).execute('inv-1');
    expect(result.total).toBe(1);
    expect(result.attachments[0]).toMatchObject({
      title: 'Signed Agreement',
      downloadUrl: 'https://cdn/invoices/inv-1/att-1',
    });
  });

  it('throws when the invoice is missing', async () => {
    await expect(
      new ListInvoiceAttachmentsUseCase(store(false), storage).execute('inv-1'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
