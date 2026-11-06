import { FamilyDirectoryEntry } from '@modules/family-directory/domain/family-directory-entry.entity';
import { FamilyDirectoryEntryRepository } from '@modules/family-directory/domain/family-directory-entry.repository';
import { DocumentStorage } from '@shared/application/ports/document-storage.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { AccountDocument } from '../../domain/account-document.entity';
import { AccountDocumentRepository } from '../../domain/account-document.repository';
import { CreateAccountDocumentTicketUseCase } from './create-account-document-ticket.use-case';
import { ListAccountDocumentsUseCase } from './list-account-documents.use-case';
import { RegisterAccountDocumentUseCase } from './register-account-document.use-case';
import { DeleteAccountDocumentUseCase } from './delete-account-document.use-case';

const NOW = new Date('2026-11-06T10:00:00.000Z');
const clock = { now: () => NOW };
let counter = 0;
const ids = { generate: () => `doc-${(counter += 1)}` };

function entries(present: boolean): FamilyDirectoryEntryRepository {
  const entry = FamilyDirectoryEntry.registerBillingAccount({
    id: 'acc-1',
    accountName: 'Adeyemi Family Account',
    primaryContact: 'Funmilayo Adeyemi',
    now: NOW,
  });
  return {
    save: () => Promise.resolve(),
    saveMany: () => Promise.resolve(),
    findById: (id) => Promise.resolve(present && id === 'acc-1' ? entry : null),
    findByUserId: () => Promise.resolve(null),
    findByIds: () => Promise.resolve([]),
  };
}

function documentStore(initial: AccountDocument[] = []): AccountDocumentRepository & {
  items: AccountDocument[];
} {
  const items = [...initial];
  return {
    items,
    add: (document) => {
      items.push(document);
      return Promise.resolve();
    },
    listByAccount: (accountId) =>
      Promise.resolve(items.filter((d) => d.familyDirectoryEntryId === accountId)),
    findById: (id) => Promise.resolve(items.find((d) => d.id === id) ?? null),
    remove: (id) => {
      const index = items.findIndex((d) => d.id === id);
      if (index >= 0) {
        items.splice(index, 1);
      }
      return Promise.resolve();
    },
  };
}

const admins = { names: () => Promise.resolve(new Map([['admin-3', 'Sarah Jenkins']])) };

const storage: DocumentStorage = {
  createUploadTicket: ({ reference }) => ({
    uploadUrl: 'https://upload',
    fields: { public_id: reference },
    key: reference,
  }),
  urlFor: (key) => `https://cdn/${key}`,
};

describe('CreateAccountDocumentTicketUseCase', () => {
  it('issues a ticket keyed under the account', async () => {
    counter = 0;
    const ticket = await new CreateAccountDocumentTicketUseCase(
      entries(true),
      storage,
      ids,
      clock,
    ).execute({ accountId: 'acc-1' });
    expect(ticket.key).toBe('acc-1/doc-1');
  });

  it('throws when the account is missing', async () => {
    await expect(
      new CreateAccountDocumentTicketUseCase(entries(false), storage, ids, clock).execute({
        accountId: 'acc-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('RegisterAccountDocumentUseCase', () => {
  const command = {
    accountId: 'acc-1',
    title: 'ID Verification',
    fileName: 'CP_ID_Adeyemi_Funmilayo.pdf',
    storageKey: 'acc-1/doc-1',
    sizeBytes: 4_404_019,
    adminId: 'admin-3',
  };

  it('records the document metadata against the account', async () => {
    counter = 0;
    const docs = documentStore();
    const result = await new RegisterAccountDocumentUseCase(
      entries(true),
      docs,
      ids,
      clock,
    ).execute(command);
    expect(result.id).toBe('doc-1');
    expect(docs.items[0].title).toBe('ID Verification');
    expect(docs.items[0].uploadedByAdminId).toBe('admin-3');
  });

  it('rejects a non positive file size', async () => {
    await expect(
      new RegisterAccountDocumentUseCase(entries(true), documentStore(), ids, clock).execute({
        ...command,
        sizeBytes: 0,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('throws when the account is missing', async () => {
    await expect(
      new RegisterAccountDocumentUseCase(entries(false), documentStore(), ids, clock).execute(
        command,
      ),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('ListAccountDocumentsUseCase', () => {
  it('lists the account documents with a signed URL', async () => {
    const doc = AccountDocument.register({
      id: 'doc-1',
      familyDirectoryEntryId: 'acc-1',
      title: 'ID Verification',
      fileName: 'id.pdf',
      storageKey: 'acc-1/doc-1',
      sizeBytes: 4_404_019,
      uploadedByAdminId: 'admin-3',
      now: NOW,
    });
    const result = await new ListAccountDocumentsUseCase(
      entries(true),
      documentStore([doc]),
      storage,
      admins,
    ).execute('acc-1');
    expect(result.total).toBe(1);
    expect(result.documents[0]).toMatchObject({
      title: 'ID Verification',
      uploadedBy: 'Sarah Jenkins',
      downloadUrl: 'https://cdn/acc-1/doc-1',
    });
  });

  it('throws when the account is missing', async () => {
    await expect(
      new ListAccountDocumentsUseCase(entries(false), documentStore(), storage, admins).execute(
        'acc-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('DeleteAccountDocumentUseCase', () => {
  it('removes a document scoped to its account', async () => {
    const doc = AccountDocument.register({
      id: 'doc-1',
      familyDirectoryEntryId: 'acc-1',
      title: 'ID Verification',
      fileName: 'id.pdf',
      storageKey: 'acc-1/doc-1',
      sizeBytes: 100,
      now: NOW,
    });
    const store = documentStore([doc]);
    await new DeleteAccountDocumentUseCase(store).execute({
      accountId: 'acc-1',
      documentId: 'doc-1',
    });
    expect(store.items).toHaveLength(0);
  });

  it('throws when the document is on a different account', async () => {
    const doc = AccountDocument.register({
      id: 'doc-1',
      familyDirectoryEntryId: 'acc-1',
      title: 'ID Verification',
      fileName: 'id.pdf',
      storageKey: 'acc-1/doc-1',
      sizeBytes: 100,
      now: NOW,
    });
    await expect(
      new DeleteAccountDocumentUseCase(documentStore([doc])).execute({
        accountId: 'other',
        documentId: 'doc-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
