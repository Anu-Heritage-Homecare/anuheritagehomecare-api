import { CaregiverAvailability } from './caregiver-availability.entity';

/**
 * Persistence port for the CaregiverAvailability aggregate. Declared in the
 * domain as an interface; infrastructure supplies the Prisma adapter and the
 * application depends only on this abstraction (dependency inversion).
 */
export interface CaregiverAvailabilityRepository {
  findByCaregiverAndDate(caregiverId: string, date: Date): Promise<CaregiverAvailability | null>;
  listForCaregiverInRange(
    caregiverId: string,
    from: Date,
    to: Date,
  ): Promise<CaregiverAvailability[]>;
  save(availability: CaregiverAvailability): Promise<void>;
}

/** Injection token, since TypeScript interfaces do not exist at runtime. */
export const CAREGIVER_AVAILABILITY_REPOSITORY = Symbol('CAREGIVER_AVAILABILITY_REPOSITORY');
