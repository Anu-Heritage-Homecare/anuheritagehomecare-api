import { CareRequestStatus } from '@prisma/client';
import { CareRequestPageView, CareRequestsReadModel } from '../ports/care-requests-read.port';
import { ListCareRequestsUseCase } from './list-care-requests.use-case';

function page(): CareRequestPageView {
  return {
    total: 1,
    rows: [
      {
        id: 'req-1',
        familyName: 'David Johnson',
        patientName: 'Margaret Johnson',
        careType: 'Overnight care',
        requestedDate: new Date('2026-09-20T00:00:00.000Z'),
        startMinute: 540,
        durationMinutes: 180,
        reason: 'Family travelling',
        status: CareRequestStatus.PENDING,
        createdAt: new Date('2026-09-15T09:00:00.000Z'),
      },
    ],
  };
}

describe('ListCareRequestsUseCase', () => {
  it('maps rows with family and patient names and formatted dates', async () => {
    const reads: CareRequestsReadModel = { listCareRequests: () => Promise.resolve(page()) };
    const result = await new ListCareRequestsUseCase(reads).execute({
      status: CareRequestStatus.PENDING,
      page: 1,
      pageSize: 20,
    });
    expect(result.total).toBe(1);
    const row = result.rows[0];
    expect(row.familyName).toBe('David Johnson');
    expect(row.patientName).toBe('Margaret Johnson');
    expect(row.careType).toBe('Overnight care');
    expect(row.requestedDate).toBe('2026-09-20T00:00:00.000Z');
    expect(row.status).toBe('PENDING');
  });
});
