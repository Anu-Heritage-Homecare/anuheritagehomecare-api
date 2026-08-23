import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { VisitStatus } from '../../domain/visit-status.enum';
import { VisitBreak } from '../../domain/value-objects/visit-break.vo';
import {
  FIXED_NOW,
  FakeCareRecipientDirectory,
  InMemoryVisitRepository,
  buildSnapshot,
  buildVisit,
  fixedClock,
} from '../../test-support/doubles';
import { ClockOutVisitUseCase } from './clock-out-visit.use-case';

describe('ClockOutVisitUseCase', () => {
  let visits: InMemoryVisitRepository;
  let recipients: FakeCareRecipientDirectory;
  let useCase: ClockOutVisitUseCase;

  beforeEach(() => {
    visits = new InMemoryVisitRepository();
    recipients = new FakeCareRecipientDirectory();
    recipients.add(buildSnapshot());
    useCase = new ClockOutVisitUseCase(visits, recipients, fixedClock);
  });

  it('completes a visit and returns the recipient and time breakdown', async () => {
    // Clocked in fifteen minutes and thirty two seconds before now, with a two
    // minute break, so the active time excludes the break.
    const clockInAt = new Date(FIXED_NOW.getTime() - (15 * 60 + 32) * 1000);
    const breakStart = new Date(clockInAt.getTime() + 60 * 1000);
    await visits.save(
      buildVisit({
        id: 'v1',
        status: VisitStatus.InProgress,
        clockInAt,
        breaks: [VisitBreak.rehydrate(breakStart, new Date(breakStart.getTime() + 120 * 1000))],
      }),
    );

    const result = await useCase.execute({ caregiverId: 'caregiver-1', visitId: 'v1' });

    expect(result.status).toBe(VisitStatus.Completed);
    expect(result.recipientName).toBe('Eleanor Ross');
    expect(result.clockOutAt).not.toBeNull();
    expect(result.breakSeconds).toBe(120);
    // 932 seconds elapsed, less the 120 second break.
    expect(result.activeSeconds).toBe(812);
  });

  it('refuses to clock out a visit that was never clocked into', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.Scheduled }));

    await expect(
      useCase.execute({ caregiverId: 'caregiver-1', visitId: 'v1' }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('hides a visit that belongs to another caregiver', async () => {
    await visits.save(buildVisit({ id: 'v1', caregiverId: 'caregiver-2' }));

    await expect(
      useCase.execute({ caregiverId: 'caregiver-1', visitId: 'v1' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
