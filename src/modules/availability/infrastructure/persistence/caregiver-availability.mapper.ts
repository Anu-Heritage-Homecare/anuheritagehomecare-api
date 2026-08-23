import {
  CaregiverAvailability as CaregiverAvailabilityRow,
  CaregiverAvailabilitySlot as CaregiverAvailabilitySlotRow,
} from '@prisma/client';
import { CaregiverAvailability } from '../../domain/caregiver-availability.entity';
import { AvailabilitySlot } from '../../domain/value-objects/availability-slot.vo';

type CaregiverAvailabilityWithSlots = CaregiverAvailabilityRow & {
  slots: CaregiverAvailabilitySlotRow[];
};

/**
 * Translates between the CaregiverAvailability aggregate and its Prisma rows. The
 * only place that knows both shapes; Prisma types never leak past here.
 */
export class CaregiverAvailabilityMapper {
  static toDomain(row: CaregiverAvailabilityWithSlots): CaregiverAvailability {
    return CaregiverAvailability.rehydrate(row.id, {
      caregiverId: row.caregiverId,
      date: row.date,
      slots: row.slots.map((slot) => AvailabilitySlot.create(slot.startMinute, slot.endMinute)),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(availability: CaregiverAvailability): {
    id: string;
    caregiverId: string;
    date: Date;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: availability.id,
      caregiverId: availability.caregiverId,
      date: availability.date,
      createdAt: availability.createdAt,
      updatedAt: availability.updatedAt,
    };
  }

  static toSlotRows(
    availability: CaregiverAvailability,
  ): { startMinute: number; endMinute: number }[] {
    return availability.slots.map((slot) => ({
      startMinute: slot.startMinute,
      endMinute: slot.endMinute,
    }));
  }
}
