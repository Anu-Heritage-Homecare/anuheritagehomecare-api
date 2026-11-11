import { Currency } from '@shared/domain/currency.enum';
import { AutoAssignAlgorithm } from '../../domain/auto-assign-algorithm.enum';
import { RateUnit } from '../../domain/rate-unit.enum';
import { ServiceOffering } from '../../domain/service-offering.entity';
import { ServiceOfferingRepository } from '../../domain/service-offering.repository';
import { VisitFormat } from '../../domain/visit-format.entity';
import { VisitFormatRepository } from '../../domain/visit-format.repository';
import { SchedulingGuardrails } from '../../domain/scheduling-guardrails.entity';
import {
  SCHEDULING_GUARDRAILS_ID,
  SchedulingGuardrailsRepository,
} from '../../domain/scheduling-guardrails.repository';
import { TaskChecklistReadPort, TaskChecklistSummary } from '../ports/task-checklist-read.port';

export interface ServiceOfferingResult {
  id: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  sortOrder: number;
}

export interface VisitFormatRateResult {
  currency: Currency;
  baseRateMinor: number;
}

export interface VisitFormatResult {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number | null;
  rateUnit: RateUnit;
  isActive: boolean;
  sortOrder: number;
  rates: VisitFormatRateResult[];
}

export interface SchedulingGuardrailsResult {
  minimumNoticeHours: number;
  travelBufferMinutes: number;
  maxVisitsPerCaregiverPerDay: number;
  autoAssignAlgorithm: AutoAssignAlgorithm;
}

/** The whole Care Operations settings screen in one shape. */
export interface CareOperationsResult {
  serviceOfferings: ServiceOfferingResult[];
  visitFormats: VisitFormatResult[];
  guardrails: SchedulingGuardrailsResult;
  taskChecklists: TaskChecklistSummary[];
}

export function toServiceOfferingResult(offering: ServiceOffering): ServiceOfferingResult {
  return {
    id: offering.id,
    name: offering.name,
    description: offering.description,
    isEnabled: offering.isEnabled,
    sortOrder: offering.sortOrder,
  };
}

export function toVisitFormatResult(format: VisitFormat): VisitFormatResult {
  return {
    id: format.id,
    name: format.name,
    description: format.description,
    durationMinutes: format.durationMinutes,
    rateUnit: format.rateUnit,
    isActive: format.isActive,
    sortOrder: format.sortOrder,
    rates: format.rates.map((rate) => ({
      currency: rate.currency,
      baseRateMinor: rate.baseRateMinor,
    })),
  };
}

export function toGuardrailsResult(guardrails: SchedulingGuardrails): SchedulingGuardrailsResult {
  return {
    minimumNoticeHours: guardrails.minimumNoticeHours,
    travelBufferMinutes: guardrails.travelBufferMinutes,
    maxVisitsPerCaregiverPerDay: guardrails.maxVisitsPerCaregiverPerDay,
    autoAssignAlgorithm: guardrails.autoAssignAlgorithm,
  };
}

/** Assemble the whole screen. Every read and mutation returns this shape. */
export async function loadCareOperationsResult(
  services: ServiceOfferingRepository,
  formats: VisitFormatRepository,
  guardrailsRepo: SchedulingGuardrailsRepository,
  checklists: TaskChecklistReadPort,
  now: Date,
): Promise<CareOperationsResult> {
  const [offerings, visitFormats, guardrails, taskChecklists] = await Promise.all([
    services.list(),
    formats.list(),
    guardrailsRepo.get(),
    checklists.listActive(),
  ]);
  return {
    serviceOfferings: offerings.map(toServiceOfferingResult),
    visitFormats: visitFormats.map(toVisitFormatResult),
    guardrails: toGuardrailsResult(
      guardrails ?? SchedulingGuardrails.defaults(SCHEDULING_GUARDRAILS_ID, now),
    ),
    taskChecklists,
  };
}
