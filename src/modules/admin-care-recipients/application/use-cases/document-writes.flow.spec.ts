import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { DocumentCategory } from '@modules/care-recipients/domain/document-category.enum';
import { DocumentStatus } from '@modules/care-recipients/domain/document-status.enum';
import { RecipientDocument } from '@modules/care-recipients/domain/recipient-document.entity';
import { RecipientDocumentRepository } from '@modules/care-recipients/domain/recipient-document.repository';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { DeleteDocumentUseCase } from './delete-document.use-case';
import { SetDocumentStatusUseCase } from './set-document-status.use-case';
import { UploadDocumentUseCase } from './upload-document.use-case';

const NOW = new Date('2026-07-24T00:00:00.000Z');
const clock: Clock = { now: () => NOW };
const R = 'r1';

function ids(): IdGenerator {
  let n = 0;
  return { generate: () => `id-${(n += 1)}` };
}

function recipients(exists: boolean): CareRecipientRepository {
  return {
    save: () => Promise.resolve(),
    findById: (id) =>
      Promise.resolve(exists && id === R ? ({ id } as unknown as CareRecipient) : null),
    findByIds: () => Promise.resolve([]),
    listByOwner: () => Promise.resolve([]),
  };
}

class DocStore implements RecipientDocumentRepository {
  public items: RecipientDocument[] = [];
  add(document: RecipientDocument): Promise<void> {
    this.items.push(document);
    return Promise.resolve();
  }
  save(document: RecipientDocument): Promise<void> {
    const index = this.items.findIndex((d) => d.id === document.id);
    if (index !== -1) {
      this.items[index] = document;
    }
    return Promise.resolve();
  }
  findById(id: string): Promise<RecipientDocument | null> {
    return Promise.resolve(this.items.find((d) => d.id === id) ?? null);
  }
  remove(id: string): Promise<void> {
    this.items = this.items.filter((d) => d.id !== id);
    return Promise.resolve();
  }
}

function existing(id: string, recipientId: string): RecipientDocument {
  return RecipientDocument.upload({
    id,
    careRecipientId: recipientId,
    name: 'Fall_Incident_Report.pdf',
    category: DocumentCategory.MedicalRecords,
    storageKey: 'docs/x.pdf',
    sizeBytes: 156_000,
    now: NOW,
  });
}

describe('document admin writes', () => {
  it('uploads a document metadata record', async () => {
    const store = new DocStore();
    const useCase = new UploadDocumentUseCase(recipients(true), store, clock, ids());

    const { id } = await useCase.execute({
      recipientId: R,
      name: 'Care_Plan_July_2026.pdf',
      category: DocumentCategory.CarePlans,
      storageKey: 'docs/r1/care-plan.pdf',
      sizeBytes: 245_000,
      uploadedByName: 'Mike Chen',
    });

    expect(store.items).toHaveLength(1);
    expect(store.items[0].id).toBe(id);
    expect(store.items[0].name).toBe('Care_Plan_July_2026.pdf');
    expect(store.items[0].category).toBe(DocumentCategory.CarePlans);
  });

  it('rejects uploading for an unknown recipient', async () => {
    const useCase = new UploadDocumentUseCase(recipients(false), new DocStore(), clock, ids());
    await expect(
      useCase.execute({
        recipientId: 'nope',
        name: 'x.pdf',
        category: DocumentCategory.Legal,
        storageKey: 'k',
        sizeBytes: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('changes a document status', async () => {
    const store = new DocStore();
    store.items.push(existing('d1', R));
    const useCase = new SetDocumentStatusUseCase(store, clock);

    const result = await useCase.execute({
      recipientId: R,
      documentId: 'd1',
      status: DocumentStatus.Verified,
    });

    expect(result.status).toBe(DocumentStatus.Verified);
    expect((await store.findById('d1'))?.status).toBe(DocumentStatus.Verified);
  });

  it('deletes a document', async () => {
    const store = new DocStore();
    store.items.push(existing('d1', R));
    const useCase = new DeleteDocumentUseCase(store);
    await useCase.execute({ recipientId: R, documentId: 'd1' });
    expect(store.items).toHaveLength(0);
  });

  it('rejects acting on a document that belongs to another recipient', async () => {
    const store = new DocStore();
    store.items.push(existing('d1', 'other'));
    const useCase = new DeleteDocumentUseCase(store);
    await expect(useCase.execute({ recipientId: R, documentId: 'd1' })).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });
});
