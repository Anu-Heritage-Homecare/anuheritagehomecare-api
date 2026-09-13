import { ValidationException } from '@shared/domain/domain-exception';
import { DocumentCategory } from './document-category.enum';
import { DocumentStatus } from './document-status.enum';
import { RecipientDocument } from './recipient-document.entity';

const NOW = new Date('2026-07-20T00:00:00.000Z');

function upload(
  overrides: Partial<Parameters<typeof RecipientDocument.upload>[0]> = {},
): RecipientDocument {
  return RecipientDocument.upload({
    id: 'd1',
    careRecipientId: 'r1',
    name: '  Care_Plan_July_2026.pdf ',
    category: DocumentCategory.CarePlans,
    storageKey: 'docs/r1/care-plan.pdf',
    sizeBytes: 245_000,
    uploadedByName: '  Mike Chen ',
    now: NOW,
    ...overrides,
  });
}

describe('RecipientDocument', () => {
  it('uploads with trimmed name and uploader, defaulting to current', () => {
    const doc = upload();
    expect(doc.name).toBe('Care_Plan_July_2026.pdf');
    expect(doc.uploadedByName).toBe('Mike Chen');
    expect(doc.status).toBe(DocumentStatus.Current);
    expect(doc.uploadedAt).toEqual(NOW);
    expect(doc.expiresAt).toBeNull();
  });

  it('rejects a blank name and a negative size', () => {
    expect(() => upload({ name: '   ' })).toThrow(ValidationException);
    expect(() => upload({ sizeBytes: -1 })).toThrow(ValidationException);
  });

  it('changes the review status', () => {
    const doc = upload();
    const later = new Date('2026-07-21T00:00:00.000Z');
    doc.setStatus(DocumentStatus.Verified, later);
    expect(doc.status).toBe(DocumentStatus.Verified);
    expect(doc.updatedAt).toEqual(later);
  });
});
