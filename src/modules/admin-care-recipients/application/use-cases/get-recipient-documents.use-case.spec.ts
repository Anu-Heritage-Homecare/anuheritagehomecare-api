import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { DocumentCategory } from '@modules/care-recipients/domain/document-category.enum';
import { DocumentStatus } from '@modules/care-recipients/domain/document-status.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  DocumentActivityView,
  DocumentCountsView,
  DocumentFilter,
  DocumentPageView,
  DocumentRowView,
  RecipientDocumentReadModel,
} from '../ports/recipient-document-read.port';
import { GetRecipientDocumentsUseCase } from './get-recipient-documents.use-case';

const NOW = new Date('2026-07-24T00:00:00.000Z');
const clock: Clock = { now: () => NOW };
const R = 'r1';

function recipients(exists: boolean): CareRecipientRepository {
  return {
    save: () => Promise.resolve(),
    findById: (id) =>
      Promise.resolve(exists && id === R ? ({ id } as unknown as CareRecipient) : null),
    findByIds: () => Promise.resolve([]),
    listByOwner: () => Promise.resolve([]),
  };
}

function row(overrides: Partial<DocumentRowView>): DocumentRowView {
  return {
    id: 'd1',
    name: 'Care_Plan_July_2026.pdf',
    category: DocumentCategory.CarePlans,
    uploadedAt: new Date('2026-07-20T00:00:00.000Z'),
    uploadedByName: 'Mike Chen',
    status: DocumentStatus.Current,
    sizeBytes: 245_000,
    expiresAt: null,
    ...overrides,
  };
}

class FakeReadModel implements RecipientDocumentReadModel {
  public lastFilter: DocumentFilter | null = null;
  constructor(
    private readonly page: DocumentPageView,
    private readonly countsView: DocumentCountsView,
    private readonly activityView: DocumentActivityView[],
  ) {}
  listPage(filter: DocumentFilter): Promise<DocumentPageView> {
    this.lastFilter = filter;
    return Promise.resolve(this.page);
  }
  counts(): Promise<DocumentCountsView> {
    return Promise.resolve(this.countsView);
  }
  recentActivity(): Promise<DocumentActivityView[]> {
    return Promise.resolve(this.activityView);
  }
}

const counts: DocumentCountsView = {
  total: 24,
  byCategory: new Map([
    [DocumentCategory.MedicalRecords, 8],
    [DocumentCategory.CarePlans, 4],
    [DocumentCategory.Legal, 5],
  ]),
  pendingReview: 3,
  expiringSoon: 2,
  lastUploadAt: new Date('2026-07-22T00:00:00.000Z'),
};

const baseQuery = {
  recipientId: R,
  category: null,
  search: null,
  sortField: 'DATE' as const,
  sortDirection: 'DESC' as const,
  page: 1,
  pageSize: 10,
};

describe('GetRecipientDocumentsUseCase', () => {
  it('rejects an unknown recipient', async () => {
    const useCase = new GetRecipientDocumentsUseCase(
      recipients(false),
      new FakeReadModel({ rows: [], total: 0 }, counts, []),
      clock,
    );
    await expect(useCase.execute({ ...baseQuery, recipientId: 'nope' })).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });

  it('builds the summary cards and category counts including zeroed categories', async () => {
    const useCase = new GetRecipientDocumentsUseCase(
      recipients(true),
      new FakeReadModel({ rows: [], total: 0 }, counts, []),
      clock,
    );
    const result = await useCase.execute(baseQuery);
    expect(result.summary.totalDocuments).toBe(24);
    expect(result.summary.pendingReview).toBe(3);
    expect(result.summary.expiringSoon).toBe(2);
    expect(result.all).toBe(24);
    const byCat = new Map(result.categories.map((c) => [c.category, c.count]));
    expect(byCat.get('MEDICAL_RECORDS')).toBe(8);
    // A category with no documents still appears with zero.
    expect(byCat.get('PHOTOS')).toBe(0);
  });

  it('derives Expiring Soon over the stored status for a soon expiring document', async () => {
    const expiring = row({
      id: 'cert',
      name: 'CPR_Cert.pdf',
      category: DocumentCategory.Certifications,
      status: DocumentStatus.Verified,
      expiresAt: new Date('2026-08-01T00:00:00.000Z'),
    });
    const current = row({ id: 'plan', status: DocumentStatus.Current, expiresAt: null });
    const useCase = new GetRecipientDocumentsUseCase(
      recipients(true),
      new FakeReadModel({ rows: [expiring, current], total: 2 }, counts, []),
      clock,
    );
    const result = await useCase.execute(baseQuery);
    const byId = new Map(result.page.items.map((i) => [i.id, i.displayStatus]));
    // Expires within 30 days of NOW (2026-07-24) -> Expiring Soon.
    expect(byId.get('cert')).toBe('EXPIRING_SOON');
    expect(byId.get('plan')).toBe('CURRENT');
  });

  it('passes the filter through and paginates', async () => {
    const readModel = new FakeReadModel({ rows: [], total: 24 }, counts, [
      { documentName: 'Fall Incident Report', uploadedByName: 'Sarah Williams', at: NOW },
    ]);
    const useCase = new GetRecipientDocumentsUseCase(recipients(true), readModel, clock);
    const result = await useCase.execute({
      ...baseQuery,
      category: DocumentCategory.Legal,
      sortField: 'SIZE',
      page: 2,
    });
    expect(readModel.lastFilter?.category).toBe(DocumentCategory.Legal);
    expect(readModel.lastFilter?.sortField).toBe('SIZE');
    expect(result.page.total).toBe(24);
    expect(result.page.totalPages).toBe(3);
    expect(result.activity[0].documentName).toBe('Fall Incident Report');
  });
});
