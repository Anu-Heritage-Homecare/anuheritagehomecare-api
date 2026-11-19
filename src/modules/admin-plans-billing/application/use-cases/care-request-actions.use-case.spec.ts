import { AdditionalCareRequest } from '@modules/care-requests/domain/additional-care-request.entity';
import { AdditionalCareRequestRepository } from '@modules/care-requests/domain/additional-care-request.repository';
import { CareRequestStatus } from '@modules/care-requests/domain/care-request-status.enum';
import {
  OneOffVisitDetails,
  VisitScheduler,
} from '@modules/visits/application/ports/visit-scheduler.port';
import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { ApproveCareRequestUseCase } from './approve-care-request.use-case';
import { DeclineCareRequestUseCase } from './decline-care-request.use-case';

const NOW = new Date('2026-09-16T12:00:00.000Z');
const clock: Clock = { now: () => NOW };

function recordingScheduler(): VisitScheduler & { oneOff: OneOffVisitDetails[] } {
  const oneOff: OneOffVisitDetails[] = [];
  return {
    oneOff,
    scheduleOneOff: (details) => {
      oneOff.push(details);
      return Promise.resolve();
    },
    scheduleForSubscription: () => Promise.resolve(),
  };
}

function pending(): AdditionalCareRequest {
  return AdditionalCareRequest.submit({
    id: 'req-1',
    ownerId: 'owner-1',
    careRecipientId: 'recipient-1',
    careType: 'Overnight care',
    requestedDate: new Date('2026-09-20T00:00:00.000Z'),
    startMinute: 540,
    durationMinutes: 180,
    now: NOW,
  });
}

function repo(
  request: AdditionalCareRequest | null,
): AdditionalCareRequestRepository & { saved: AdditionalCareRequest[] } {
  const saved: AdditionalCareRequest[] = [];
  return {
    saved,
    findById: () => Promise.resolve(request),
    save: (r) => {
      saved.push(r);
      return Promise.resolve();
    },
    listByCareRecipient: () => Promise.resolve([]),
  };
}

describe('ApproveCareRequestUseCase', () => {
  it('approves the request, records the admin and schedules the visit', async () => {
    const request = pending();
    const store = repo(request);
    const scheduler = recordingScheduler();
    await new ApproveCareRequestUseCase(store, scheduler, clock).execute({
      requestId: 'req-1',
      adminId: 'admin-9',
    });
    expect(request.status).toBe(CareRequestStatus.Approved);
    expect(request.actionedByAdminId).toBe('admin-9');
    expect(store.saved).toHaveLength(1);
    expect(scheduler.oneOff).toEqual([
      {
        careRecipientId: 'recipient-1',
        date: new Date('2026-09-20T00:00:00.000Z'),
        startMinute: 540,
        endMinute: 720,
      },
    ]);
  });

  it('rejects an unknown request', async () => {
    await expect(
      new ApproveCareRequestUseCase(repo(null), recordingScheduler(), clock).execute({
        requestId: 'nope',
        adminId: 'admin-9',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('DeclineCareRequestUseCase', () => {
  it('declines the request with a note', async () => {
    const request = pending();
    const store = repo(request);
    await new DeclineCareRequestUseCase(store, clock).execute({
      requestId: 'req-1',
      adminId: 'admin-9',
      note: 'No caregiver available',
    });
    expect(request.status).toBe(CareRequestStatus.Declined);
    expect(request.decisionNote).toBe('No caregiver available');
    expect(store.saved).toHaveLength(1);
  });

  it('rejects an unknown request', async () => {
    await expect(
      new DeclineCareRequestUseCase(repo(null), clock).execute({
        requestId: 'nope',
        adminId: 'admin-9',
        note: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
