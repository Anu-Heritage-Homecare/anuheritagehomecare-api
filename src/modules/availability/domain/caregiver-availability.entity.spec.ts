import { ValidationException } from '@shared/domain/domain-exception';
import { CaregiverAvailability } from './caregiver-availability.entity';
import { AvailabilitySlot } from './value-objects/availability-slot.vo';

const NOW = new Date('2026-07-11T12:00:00.000Z');
const DAY = new Date('2026-07-11T00:00:00.000Z');

function build(slots: AvailabilitySlot[]): CaregiverAvailability {
  return CaregiverAvailability.create({
    id: 'availability-1',
    caregiverId: 'caregiver-1',
    date: DAY,
    slots,
    now: NOW,
  });
}

describe('CaregiverAvailability', () => {
  it('orders the slots by start time', () => {
    const availability = build([
      AvailabilitySlot.create(13 * 60, 14 * 60), // 01:00 pm
      AvailabilitySlot.create(8 * 60, 9 * 60), // 08:00 am
    ]);

    expect(availability.slots.map((slot) => slot.startMinute)).toEqual([8 * 60, 13 * 60]);
  });

  it('allows adjacent slots that touch at a boundary', () => {
    const availability = build([
      AvailabilitySlot.create(8 * 60, 9 * 60),
      AvailabilitySlot.create(9 * 60, 10 * 60),
    ]);

    expect(availability.slots).toHaveLength(2);
  });

  it('rejects overlapping slots', () => {
    expect(() =>
      build([AvailabilitySlot.create(8 * 60, 10 * 60), AvailabilitySlot.create(9 * 60, 11 * 60)]),
    ).toThrow(ValidationException);
  });

  it('replaces the whole set when set again', () => {
    const availability = build([AvailabilitySlot.create(8 * 60, 9 * 60)]);

    availability.setSlots([AvailabilitySlot.create(14 * 60, 15 * 60)], NOW);

    expect(availability.slots.map((slot) => slot.startMinute)).toEqual([14 * 60]);
  });
});
