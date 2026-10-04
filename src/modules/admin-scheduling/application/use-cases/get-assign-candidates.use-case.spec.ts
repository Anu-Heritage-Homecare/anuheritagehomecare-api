import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AssignCandidateResult, AssignCandidatesResult } from '../dto/assign-candidates.result';
import {
  AssignCandidateRaw,
  AssignCandidateReadModel,
  AssignMatchContext,
} from '../ports/assign-candidate-read.port';
import { GetAssignCandidatesUseCase } from './get-assign-candidates.use-case';

const NOW = new Date('2026-07-24T10:00:00.000Z');
const clock: Clock = { now: () => NOW };
const FUTURE = new Date('2027-12-31T00:00:00.000Z');
const PAST = new Date('2025-01-01T00:00:00.000Z');
const FULL_DAY = [{ startMinute: 0, endMinute: 1440 }];

function candidate(
  over: Partial<AssignCandidateRaw> & { caregiverId: string; name: string },
): AssignCandidateRaw {
  return {
    title: 'CNA',
    branch: 'West',
    skills: [],
    ratingAverage: 4.5,
    ratingCount: 10,
    certifications: [{ name: 'Wound Care', expiresAt: FUTURE }],
    dayVisits: [],
    availabilityWindows: FULL_DAY,
    lastLatitude: 40.05,
    lastLongitude: -89.0,
    ...over,
  };
}

function context(): AssignMatchContext {
  return {
    visit: {
      id: 'visit-1',
      status: 'SCHEDULED',
      recipientName: 'James Wilson',
      serviceType: 'WOUND_CARE',
      priority: 'URGENT',
      scheduledDate: new Date(Date.UTC(2026, 6, 24)),
      startMinute: 660,
      endMinute: 750,
      location: '456 Elm St, Springfield',
      recipientLatitude: 40.0,
      recipientLongitude: -89.0,
    },
    candidates: [
      candidate({
        caregiverId: 'sarah',
        name: 'Sarah Williams',
        ratingAverage: 4.9,
        lastLatitude: 40.0, // same as recipient -> nearest
        certifications: [
          { name: 'CNA', expiresAt: FUTURE },
          { name: 'Wound Care', expiresAt: FUTURE },
          { name: 'CPR', expiresAt: FUTURE },
        ],
        dayVisits: [{ startMinute: 480, endMinute: 540, status: 'COMPLETED' }],
      }),
      candidate({ caregiverId: 'david', name: 'David Park', ratingAverage: 4.7 }),
      candidate({
        caregiverId: 'emma',
        name: 'Emma Wilson',
        ratingAverage: 4.4,
        availabilityWindows: [{ startMinute: 720, endMinute: 1080 }], // starts after the visit
      }),
      candidate({
        caregiverId: 'lisa',
        name: 'Lisa Thompson',
        ratingAverage: 4.6,
        certifications: [
          { name: 'CNA', expiresAt: FUTURE },
          { name: 'CPR', expiresAt: FUTURE },
        ],
      }),
      candidate({
        caregiverId: 'john',
        name: 'John Adams',
        dayVisits: [{ startMinute: 600, endMinute: 780, status: 'IN_PROGRESS' }], // overlaps 11:00-12:30
      }),
      candidate({
        caregiverId: 'james',
        name: 'James Rivera',
        availabilityWindows: [],
        certifications: [{ name: 'Wound Care', expiresAt: PAST }],
      }),
    ],
  };
}

function reads(ctx: AssignMatchContext | null): AssignCandidateReadModel {
  return { matchContext: () => Promise.resolve(ctx) };
}

function run(
  command?: Partial<Parameters<GetAssignCandidatesUseCase['execute']>[0]>,
): Promise<AssignCandidatesResult> {
  return new GetAssignCandidatesUseCase(reads(context()), clock).execute({
    visitId: 'visit-1',
    search: null,
    branch: null,
    availableNow: false,
    sort: 'BEST_MATCH',
    ...command,
  });
}

function find(result: AssignCandidatesResult, id: string): AssignCandidateResult | undefined {
  return result.candidates.find((c) => c.caregiverId === id);
}

describe('GetAssignCandidatesUseCase', () => {
  it('derives the required credential and ranks Sarah as the best match', async () => {
    const result = await run();
    expect(result.requiredCertification).toBe('Wound Care');
    expect(result.candidates[0].caregiverId).toBe('sarah');
    expect(result.candidates[0].bestMatch).toBe(true);
    expect(find(result, 'sarah')?.distanceMiles).toBe(0);
    expect(find(result, 'sarah')?.availability.label).toBe('Available from 11:00 AM');
  });

  it('classifies eligibility per candidate', async () => {
    const result = await run();
    expect(find(result, 'lisa')?.eligibility.status).toBe('WARN');
    expect(find(result, 'lisa')?.eligibility.assignable).toBe(true);

    expect(find(result, 'john')?.eligibility.status).toBe('BLOCKED_CONFLICT');
    expect(find(result, 'john')?.eligibility.assignable).toBe(false);
    expect(find(result, 'john')?.availability.label).toBe('Busy until 1:00 PM');

    expect(find(result, 'james')?.eligibility.status).toBe('INELIGIBLE');
    expect(find(result, 'james')?.availability.status).toBe('OFF_DUTY');

    expect(find(result, 'emma')?.availability.status).toBe('AVAILABLE_LATER');

    // The two ineligible candidates sort to the end.
    const tail = result.candidates.slice(-2).map((c) => c.caregiverId);
    expect(tail).toContain('john');
    expect(tail).toContain('james');
  });

  it('filters to only available-now caregivers', async () => {
    const result = await run({ availableNow: true });
    const ids = result.candidates.map((c) => c.caregiverId);
    expect(ids).toContain('sarah');
    expect(ids).not.toContain('emma'); // available later
    expect(ids).not.toContain('john'); // busy
    expect(ids).not.toContain('james'); // off duty
  });

  it('rejects an unknown visit', async () => {
    await expect(
      new GetAssignCandidatesUseCase(reads(null), clock).execute({
        visitId: 'nope',
        search: null,
        branch: null,
        availableNow: false,
        sort: 'BEST_MATCH',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
