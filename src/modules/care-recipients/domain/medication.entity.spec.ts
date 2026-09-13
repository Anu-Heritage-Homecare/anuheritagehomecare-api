import { ValidationException } from '@shared/domain/domain-exception';
import { Medication } from './medication.entity';
import { MedicationStatus } from './medication-status.enum';

describe('Medication', () => {
  it('canonicalises dose times (ordered, de-duplicated) and derives the schedule minute', () => {
    const med = Medication.create({
      id: 'm1',
      name: 'Metformin',
      doseTimes: [1020, 480, 480],
    });
    expect(med.doseTimes).toEqual([480, 1020]);
    expect(med.scheduleMinute).toBe(480);
  });

  it('falls back to the single schedule minute for a legacy medication', () => {
    const med = Medication.create({ id: 'm1', name: 'Aspirin', scheduleMinute: 540 });
    expect(med.doseTimes).toEqual([540]);
  });

  it('trims and defaults the office fields, defaulting to active', () => {
    const med = Medication.create({
      id: 'm1',
      name: '  Donepezil ',
      purpose: '  Cognitive function ',
      prescribedBy: '   ',
    });
    expect(med.name).toBe('Donepezil');
    expect(med.purpose).toBe('Cognitive function');
    expect(med.prescribedBy).toBeNull();
    expect(med.status).toBe(MedicationStatus.Active);
    expect(med.isActive).toBe(true);
  });

  it('rejects a dose time outside the day', () => {
    expect(() => Medication.create({ id: 'm1', name: 'X', doseTimes: [1440] })).toThrow(
      ValidationException,
    );
  });

  it('edits editable fields while preserving identity and status', () => {
    const original = Medication.create({
      id: 'm1',
      name: 'Metformin',
      dose: '500mg',
      status: MedicationStatus.Active,
    });
    const updated = original.withUpdates({ name: 'Metformin', dose: '1000mg', doseTimes: [480] });
    expect(updated.id).toBe('m1');
    expect(updated.dose).toBe('1000mg');
    expect(updated.status).toBe(MedicationStatus.Active);
  });

  it('discontinues a copy and refuses to discontinue twice', () => {
    const med = Medication.create({ id: 'm1', name: 'Metformin' });
    const now = new Date('2026-09-13T00:00:00.000Z');
    const stopped = med.discontinuedCopy(now);
    expect(stopped.id).toBe('m1');
    expect(stopped.status).toBe(MedicationStatus.Discontinued);
    expect(stopped.discontinuedAt).toEqual(now);
    expect(() => stopped.discontinuedCopy(now)).toThrow(ValidationException);
  });
});
