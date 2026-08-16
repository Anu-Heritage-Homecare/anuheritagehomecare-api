import { Coordinates } from '@shared/domain/coordinates.vo';
import { OutsideGeofenceException, ValidationException } from '@shared/domain/domain-exception';
import { VisitStatus } from './visit-status.enum';
import { Visit } from './visit.entity';
import { VisitTask } from './value-objects/visit-task.vo';
import { VisitWindow } from './value-objects/visit-window.vo';

const NOW = new Date('2026-07-12T12:00:00.000Z');

function schedule(overrides: Partial<Parameters<typeof Visit.schedule>[0]> = {}): Visit {
  return Visit.schedule({
    id: 'visit-1',
    caregiverId: 'caregiver-1',
    careRecipientId: 'recipient-1',
    scheduledDate: new Date('2026-07-12T00:00:00.000Z'),
    window: VisitWindow.create(9 * 60, 10 * 60),
    now: NOW,
    ...overrides,
  });
}

describe('Visit', () => {
  it('schedules a new visit in the SCHEDULED status', () => {
    const visit = schedule();
    expect(visit.status).toBe(VisitStatus.Scheduled);
    expect(visit.tasks).toEqual([]);
  });

  it('trims and drops blank special instructions', () => {
    const visit = schedule({ specialInstructions: ['  Gate Code: 2456  ', '   ', ''] });
    expect(visit.specialInstructions).toEqual(['Gate Code: 2456']);
  });

  it('keeps its task checklist', () => {
    const visit = schedule({ tasks: [VisitTask.create('Blood Pressure', true)] });
    expect(visit.tasks).toEqual([VisitTask.create('Blood Pressure', true)]);
  });
});

describe('Visit clock in and out', () => {
  const center = Coordinates.create(37.3861, -122.0839);

  it('clocks in within the geofence and starts the visit', () => {
    const visit = schedule();
    visit.clockIn({
      at: Coordinates.create(37.3871, -122.0839),
      geofenceCenter: center,
      radiusMeters: 150,
      now: NOW,
    });
    expect(visit.status).toBe(VisitStatus.InProgress);
    expect(visit.clockInAt).toEqual(NOW);
    expect(visit.arrivalLocation?.latitude).toBe(37.3871);
  });

  it('refuses to clock in from outside the geofence', () => {
    const visit = schedule();
    expect(() =>
      visit.clockIn({
        at: Coordinates.create(37.4, -122.09),
        geofenceCenter: center,
        radiusMeters: 150,
        now: NOW,
      }),
    ).toThrow(OutsideGeofenceException);
    expect(visit.status).toBe(VisitStatus.Scheduled);
  });

  it('clocks out only after clocking in', () => {
    const visit = schedule();
    expect(() => visit.clockOut(NOW)).toThrow(ValidationException);

    visit.clockIn({ at: center, geofenceCenter: center, radiusMeters: 150, now: NOW });
    visit.clockOut(NOW);
    expect(visit.status).toBe(VisitStatus.Completed);
    expect(visit.clockOutAt).toEqual(NOW);
  });
});

describe('VisitWindow', () => {
  it('rejects an end that is not after the start', () => {
    expect(() => VisitWindow.create(600, 600)).toThrow(ValidationException);
    expect(() => VisitWindow.create(600, 540)).toThrow(ValidationException);
  });

  it('rejects a minute outside the day', () => {
    expect(() => VisitWindow.create(-1, 600)).toThrow(ValidationException);
    expect(() => VisitWindow.create(540, 1500)).toThrow(ValidationException);
  });
});

describe('VisitTask', () => {
  it('requires a non empty label', () => {
    expect(() => VisitTask.create('   ')).toThrow(ValidationException);
  });
});
