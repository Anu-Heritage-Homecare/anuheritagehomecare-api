import { Coordinates } from '@shared/domain/coordinates.vo';
import { OutsideGeofenceException, ValidationException } from '@shared/domain/domain-exception';
import { MedicationAdministrationOutcome } from './medication-administration-outcome.enum';
import { NoteAudience } from './note-audience.enum';
import { VisitStatus } from './visit-status.enum';
import { VisitType } from './visit-type.enum';
import { Visit } from './visit.entity';
import { VisitTask } from './value-objects/visit-task.vo';
import { VisitWindow } from './value-objects/visit-window.vo';
import { VitalsReading } from './value-objects/vitals-reading.vo';

const NOW = new Date('2026-07-12T12:00:00.000Z');

function schedule(overrides: Partial<Parameters<typeof Visit.schedule>[0]> = {}): Visit {
  return Visit.schedule({
    id: 'visit-1',
    caregiverId: 'caregiver-1',
    careRecipientId: 'recipient-1',
    scheduledDate: new Date('2026-07-12T00:00:00.000Z'),
    window: VisitWindow.create(9 * 60, 10 * 60),
    type: VisitType.PersonalCare,
    now: NOW,
    ...overrides,
  });
}

describe('Visit', () => {
  it('carries its visit type and defaults an unspecified priority to Normal', () => {
    const visit = schedule({ type: VisitType.WoundCare });
    expect(visit.type).toBe(VisitType.WoundCare);
    expect(visit.priority).toBe('NORMAL');
  });

  it('starts unassigned and takes a caregiver on assignment, stamping when', () => {
    const visit = Visit.scheduleUnassigned({
      id: 'visit-1',
      careRecipientId: 'recipient-1',
      scheduledDate: new Date('2026-07-12T00:00:00.000Z'),
      window: VisitWindow.create(9 * 60, 10 * 60),
      type: VisitType.MorningCare,
      now: NOW,
    });
    expect(visit.isAssigned).toBe(false);
    expect(visit.caregiverId).toBeNull();
    expect(visit.assignedAt).toBeNull();

    const assignedAt = new Date('2026-07-12T08:00:00.000Z');
    visit.assignCaregiver('caregiver-9', assignedAt);
    expect(visit.isAssigned).toBe(true);
    expect(visit.caregiverId).toBe('caregiver-9');
    expect(visit.assignedAt).toEqual(assignedAt);
  });

  it('refuses to assign a caregiver to a visit already under way', () => {
    const visit = schedule();
    visit.clockIn({
      at: Coordinates.create(37.3861, -122.0839),
      geofenceCenter: Coordinates.create(37.3861, -122.0839),
      radiusMeters: 150,
      now: NOW,
    });
    expect(() => visit.assignCaregiver('caregiver-9', NOW)).toThrow(ValidationException);
  });

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

  it('reschedules a scheduled visit to a new day and window', () => {
    const visit = schedule();
    const newDate = new Date('2026-07-15T00:00:00.000Z');
    visit.reschedule(newDate, VisitWindow.create(14 * 60, 15 * 60), NOW);
    expect(visit.scheduledDate).toEqual(newDate);
    expect(visit.window.startMinute).toBe(14 * 60);
    expect(visit.window.endMinute).toBe(15 * 60);
  });

  it('refuses to reschedule a visit already under way', () => {
    const visit = schedule();
    visit.clockIn({
      at: Coordinates.create(37.3861, -122.0839),
      geofenceCenter: Coordinates.create(37.3861, -122.0839),
      radiusMeters: 150,
      now: NOW,
    });
    expect(() => visit.reschedule(NOW, VisitWindow.create(14 * 60, 15 * 60), NOW)).toThrow(
      ValidationException,
    );
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

describe('Visit care actions', () => {
  const center = Coordinates.create(37.3861, -122.0839);

  function started(tasks: VisitTask[] = []): Visit {
    const visit = schedule({ tasks });
    visit.clockIn({ at: center, geofenceCenter: center, radiusMeters: 150, now: NOW });
    return visit;
  }

  it('records a medication outcome once per medication', () => {
    const visit = started();
    visit.recordMedication({
      medicationId: 'med-1',
      outcome: MedicationAdministrationOutcome.Refused,
      note: 'Patient refused',
      now: NOW,
    });
    visit.recordMedication({
      medicationId: 'med-1',
      outcome: MedicationAdministrationOutcome.Administered,
      now: NOW,
    });

    expect(visit.medicationAdministrations).toHaveLength(1);
    expect(visit.medicationAdministrations[0].outcome).toBe(
      MedicationAdministrationOutcome.Administered,
    );
    expect(visit.medicationAdministrations[0].note).toBeNull();
  });

  it('refuses to record medication before the visit is in progress', () => {
    const visit = schedule();
    expect(() =>
      visit.recordMedication({
        medicationId: 'med-1',
        outcome: MedicationAdministrationOutcome.Administered,
        now: NOW,
      }),
    ).toThrow(ValidationException);
  });

  it('appends vitals readings', () => {
    const visit = started();
    visit.recordVitals(VitalsReading.create({ heartRate: 72, recordedAt: NOW }), NOW);
    visit.recordVitals(VitalsReading.create({ oxygenSaturation: 98, recordedAt: NOW }), NOW);
    expect(visit.vitals).toHaveLength(2);
  });

  it('toggles a checklist task by position', () => {
    const visit = started([VisitTask.create('Assist with morning'), VisitTask.create('Bathing')]);
    visit.setTaskCompletion(1, true, NOW);
    expect(visit.tasks[1].completed).toBe(true);
    expect(visit.tasks[0].completed).toBe(false);
  });

  it('rejects toggling a task that does not exist', () => {
    const visit = started([VisitTask.create('Assist with morning')]);
    expect(() => visit.setTaskCompletion(5, true, NOW)).toThrow(ValidationException);
  });

  it('appends notes to the feed and trims the text', () => {
    const visit = started();
    visit.addNote({
      authorId: 'caregiver-1',
      audience: NoteAudience.Family,
      text: '  Patient in good spirits  ',
      now: NOW,
    });
    visit.addNote({
      authorId: 'caregiver-1',
      audience: NoteAudience.CareTeam,
      text: 'Follow up on medication.',
      now: NOW,
    });
    expect(visit.notes).toHaveLength(2);
    expect(visit.notes[0].text).toBe('Patient in good spirits');
    expect(visit.notes[0].audience).toBe(NoteAudience.Family);
    expect(visit.notes[1].audience).toBe(NoteAudience.CareTeam);
  });

  it('rejects an empty note', () => {
    const visit = started();
    expect(() =>
      visit.addNote({
        authorId: 'caregiver-1',
        audience: NoteAudience.Family,
        text: '   ',
        now: NOW,
      }),
    ).toThrow(ValidationException);
  });

  it('replaces the attached photo keys', () => {
    const visit = started();
    visit.savePhotos({ photoKeys: ['key-1', '  ', 'key-2'], now: NOW });
    expect(visit.photoKeys).toEqual(['key-1', 'key-2']);
  });
});

describe('Visit breaks', () => {
  const center = Coordinates.create(37.3861, -122.0839);
  const later = new Date('2026-07-12T12:20:00.000Z'); // 20 minutes after NOW

  function started(): Visit {
    const visit = schedule();
    visit.clockIn({ at: center, geofenceCenter: center, radiusMeters: 150, now: NOW });
    return visit;
  }

  it('starts a break, moving the visit to ON_BREAK', () => {
    const visit = started();
    visit.startBreak(NOW);
    expect(visit.status).toBe(VisitStatus.OnBreak);
    expect(visit.onBreakSince).toEqual(NOW);
  });

  it('ends a break, accumulating the break time and resuming', () => {
    const visit = started();
    visit.startBreak(NOW);
    visit.endBreak(later);
    expect(visit.status).toBe(VisitStatus.InProgress);
    expect(visit.onBreakSince).toBeNull();
    expect(visit.breakSeconds).toBe(20 * 60);
  });

  it('refuses to clock out while on a break', () => {
    const visit = started();
    visit.startBreak(NOW);
    expect(() => visit.clockOut(later)).toThrow(ValidationException);
  });

  it('refuses to start a break unless the visit is in progress', () => {
    const visit = schedule();
    expect(() => visit.startBreak(NOW)).toThrow(ValidationException);
  });

  it('refuses to end a break when none is open', () => {
    const visit = started();
    expect(() => visit.endBreak(NOW)).toThrow(ValidationException);
  });

  it('blocks recording actions while on a break', () => {
    const visit = started();
    visit.startBreak(NOW);
    expect(() =>
      visit.recordVitals(VitalsReading.create({ heartRate: 72, recordedAt: NOW }), NOW),
    ).toThrow(ValidationException);
  });
});

describe('VitalsReading', () => {
  const NOW = new Date('2026-07-12T12:00:00.000Z');

  it('requires at least one measure', () => {
    expect(() => VitalsReading.create({ recordedAt: NOW })).toThrow(ValidationException);
  });

  it('rejects a diastolic higher than the systolic', () => {
    expect(() => VitalsReading.create({ systolic: 80, diastolic: 120, recordedAt: NOW })).toThrow(
      ValidationException,
    );
  });

  it('rejects an oxygen saturation above 100', () => {
    expect(() => VitalsReading.create({ oxygenSaturation: 101, recordedAt: NOW })).toThrow(
      ValidationException,
    );
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
