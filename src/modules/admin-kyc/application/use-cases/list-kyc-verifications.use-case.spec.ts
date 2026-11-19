import { KycStatus } from '@prisma/client';
import { KycAuditPageView, KycAuditReadModel } from '../ports/kyc-audit-read.port';
import { ListKycVerificationsUseCase } from './list-kyc-verifications.use-case';

function page(): KycAuditPageView {
  return {
    total: 1,
    rows: [
      {
        id: 'kyc-1',
        ownerId: 'owner-1',
        ownerName: 'Margaret Johnson',
        country: 'NG',
        provider: 'QOREID',
        documentType: 'NIN',
        status: KycStatus.REJECTED,
        faceMatch: 'NO_MATCH',
        maskedReference: '1234',
        claimedFirstName: 'Margaret',
        claimedLastName: 'Johnson',
        claimedDateOfBirth: new Date('1950-04-02T00:00:00.000Z'),
        mismatches: [{ field: 'lastName', provided: 'Johnson', returned: 'Johns' }],
        createdAt: new Date('2026-09-15T09:00:00.000Z'),
        verifiedAt: null,
      },
    ],
  };
}

describe('ListKycVerificationsUseCase', () => {
  it('passes the status filter and pagination through to the read model', async () => {
    const listVerifications = jest.fn().mockResolvedValue({ total: 0, rows: [] });
    const reads: KycAuditReadModel = { listVerifications };
    await new ListKycVerificationsUseCase(reads).execute({
      status: KycStatus.REJECTED,
      page: 2,
      pageSize: 50,
    });
    expect(listVerifications).toHaveBeenCalledWith(KycStatus.REJECTED, 2, 50);
  });

  it('maps rows with the owner name, mismatches and ISO formatted dates', async () => {
    const reads: KycAuditReadModel = { listVerifications: () => Promise.resolve(page()) };
    const result = await new ListKycVerificationsUseCase(reads).execute({
      status: KycStatus.REJECTED,
      page: 1,
      pageSize: 20,
    });
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    const row = result.rows[0];
    expect(row.owner).toEqual({ id: 'owner-1', name: 'Margaret Johnson' });
    expect(row.status).toBe('REJECTED');
    expect(row.faceMatch).toBe('NO_MATCH');
    expect(row.maskedReference).toBe('1234');
    expect(row.claimed.dateOfBirth).toBe('1950-04-02T00:00:00.000Z');
    expect(row.mismatches).toEqual([{ field: 'lastName', provided: 'Johnson', returned: 'Johns' }]);
    expect(row.submittedAt).toBe('2026-09-15T09:00:00.000Z');
    expect(row.verifiedAt).toBeNull();
  });
});
