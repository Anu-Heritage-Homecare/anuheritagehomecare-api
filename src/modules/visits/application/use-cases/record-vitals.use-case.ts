import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { VISIT_REPOSITORY, VisitRepository } from '../../domain/visit.repository';
import { VitalsReading } from '../../domain/value-objects/vitals-reading.vo';
import { VitalsReadingResult } from '../dto/visit-care.result';
import { loadOwnedVisit } from '../load-owned-visit';

export interface RecordVitalsCommand {
  caregiverId: string;
  visitId: string;
  systolic?: number | null;
  diastolic?: number | null;
  heartRate?: number | null;
  oxygenSaturation?: number | null;
  weightGrams?: number | null;
  temperatureCelsius?: number | null;
  bloodGlucose?: number | null;
}

/**
 * Use case: a caregiver records a set of vital signs during their visit. The
 * reading is stamped with the server time and appended to the visit's history.
 */
@Injectable()
export class RecordVitalsUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: RecordVitalsCommand): Promise<VitalsReadingResult> {
    const visit = await loadOwnedVisit(this.visits, command.visitId, command.caregiverId);

    const now = this.clock.now();
    const reading = VitalsReading.create({
      systolic: command.systolic,
      diastolic: command.diastolic,
      heartRate: command.heartRate,
      oxygenSaturation: command.oxygenSaturation,
      weightGrams: command.weightGrams,
      temperatureCelsius: command.temperatureCelsius,
      bloodGlucose: command.bloodGlucose,
      recordedAt: now,
    });
    visit.recordVitals(reading, now);
    await this.visits.save(visit);

    return {
      systolic: reading.systolic,
      diastolic: reading.diastolic,
      heartRate: reading.heartRate,
      oxygenSaturation: reading.oxygenSaturation,
      weightGrams: reading.weightGrams,
      temperatureCelsius: reading.temperatureCelsius,
      bloodGlucose: reading.bloodGlucose,
      recordedAt: reading.recordedAt.toISOString(),
    };
  }
}
