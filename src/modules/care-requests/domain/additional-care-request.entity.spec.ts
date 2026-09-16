import { ValidationException } from '@shared/domain/domain-exception';
import { AdditionalCareRequest } from './additional-care-request.entity';
import { CareRequestStatus } from './care-request-status.enum';

const NOW = new Date('2026-09-16T09:00:00.000Z');
const LATER = new Date('2026-09-16T15:30:00.000Z');
const ADMIN = 'admin-1';

function pending(): AdditionalCareRequest {
  return AdditionalCareRequest.submit({
    id: 'req-1',
    ownerId: 'owner-1',
    careRecipientId: 'recipient-1',
    careType: 'Overnight care',
    requestedDate: new Date('2026-09-20T00:00:00.000Z'),
    startMinute: 540,
    durationMinutes: 180,
    reason: 'Family travelling',
    now: NOW,
  });
}

describe('AdditionalCareRequest office decisions', () => {
  it('submits as pending with an empty decision audit', () => {
    const request = pending();
    expect(request.status).toBe(CareRequestStatus.Pending);
    expect(request.actionedByAdminId).toBeNull();
    expect(request.actionedAt).toBeNull();
    expect(request.decisionNote).toBeNull();
  });

  it('approves a pending request and stamps the acting admin', () => {
    const request = pending();
    request.approve(ADMIN, LATER);
    expect(request.status).toBe(CareRequestStatus.Approved);
    expect(request.actionedByAdminId).toBe(ADMIN);
    expect(request.actionedAt).toEqual(LATER);
    expect(request.decisionNote).toBeNull();
    expect(request.updatedAt).toEqual(LATER);
  });

  it('declines a pending request and keeps the trimmed note', () => {
    const request = pending();
    request.decline(ADMIN, '  No caregiver available  ', LATER);
    expect(request.status).toBe(CareRequestStatus.Declined);
    expect(request.actionedByAdminId).toBe(ADMIN);
    expect(request.decisionNote).toBe('No caregiver available');
  });

  it('normalises an empty decline note to null', () => {
    const request = pending();
    request.decline(ADMIN, '   ', LATER);
    expect(request.decisionNote).toBeNull();
  });

  it('rejects actioning a request that is not pending', () => {
    const request = pending();
    request.approve(ADMIN, LATER);
    expect(() => request.approve(ADMIN, LATER)).toThrow(ValidationException);
    expect(() => request.decline(ADMIN, null, LATER)).toThrow(ValidationException);
  });
});
