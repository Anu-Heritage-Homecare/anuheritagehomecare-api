import {
  DischargeAcknowledgement as PrismaAcknowledgement,
  DischargeAction as PrismaAction,
  DischargeReason as PrismaReason,
  DischargeRecordStatus as PrismaStatus,
} from '@prisma/client';
import { DischargeAcknowledgement } from '../../domain/discharge-acknowledgement.enum';
import { DischargeAction } from '../../domain/discharge-action.enum';
import { DischargeReason } from '../../domain/discharge-reason.enum';
import { DischargeRecordStatus } from '../../domain/discharge-record-status.enum';

export const TO_DOMAIN_ACTION: Record<PrismaAction, DischargeAction> = {
  HOLD: DischargeAction.Hold,
  DISCHARGE: DischargeAction.Discharge,
};

export const TO_PERSISTENCE_ACTION: Record<DischargeAction, PrismaAction> = {
  [DischargeAction.Hold]: 'HOLD',
  [DischargeAction.Discharge]: 'DISCHARGE',
};

export const TO_DOMAIN_REASON: Record<PrismaReason, DischargeReason> = {
  CARE_NO_LONGER_NEEDED: DischargeReason.CareNoLongerNeeded,
  RESIDENTIAL_FACILITY_TRANSITION: DischargeReason.ResidentialFacilityTransition,
  RELOCATION_OUT_OF_COVERAGE: DischargeReason.RelocationOutOfCoverage,
  DECEASED: DischargeReason.Deceased,
  HOSPITALIZATION: DischargeReason.Hospitalization,
  FAMILY_TRAVEL: DischargeReason.FamilyTravel,
  TEMPORARY_RELOCATION: DischargeReason.TemporaryRelocation,
  OTHER: DischargeReason.Other,
};

export const TO_PERSISTENCE_REASON: Record<DischargeReason, PrismaReason> = {
  [DischargeReason.CareNoLongerNeeded]: 'CARE_NO_LONGER_NEEDED',
  [DischargeReason.ResidentialFacilityTransition]: 'RESIDENTIAL_FACILITY_TRANSITION',
  [DischargeReason.RelocationOutOfCoverage]: 'RELOCATION_OUT_OF_COVERAGE',
  [DischargeReason.Deceased]: 'DECEASED',
  [DischargeReason.Hospitalization]: 'HOSPITALIZATION',
  [DischargeReason.FamilyTravel]: 'FAMILY_TRAVEL',
  [DischargeReason.TemporaryRelocation]: 'TEMPORARY_RELOCATION',
  [DischargeReason.Other]: 'OTHER',
};

export const TO_DOMAIN_ACKNOWLEDGEMENT: Record<PrismaAcknowledgement, DischargeAcknowledgement> = {
  FINAL_ASSESSMENT_FILED: DischargeAcknowledgement.FinalAssessmentFiled,
  CLINICAL_TASKS_RESOLVED: DischargeAcknowledgement.ClinicalTasksResolved,
  FAMILY_NOTIFIED: DischargeAcknowledgement.FamilyNotified,
  FINAL_INVOICES_VERIFIED: DischargeAcknowledgement.FinalInvoicesVerified,
  RECORDS_ARCHIVED: DischargeAcknowledgement.RecordsArchived,
};

export const TO_PERSISTENCE_ACKNOWLEDGEMENT: Record<
  DischargeAcknowledgement,
  PrismaAcknowledgement
> = {
  [DischargeAcknowledgement.FinalAssessmentFiled]: 'FINAL_ASSESSMENT_FILED',
  [DischargeAcknowledgement.ClinicalTasksResolved]: 'CLINICAL_TASKS_RESOLVED',
  [DischargeAcknowledgement.FamilyNotified]: 'FAMILY_NOTIFIED',
  [DischargeAcknowledgement.FinalInvoicesVerified]: 'FINAL_INVOICES_VERIFIED',
  [DischargeAcknowledgement.RecordsArchived]: 'RECORDS_ARCHIVED',
};

export const TO_DOMAIN_STATUS: Record<PrismaStatus, DischargeRecordStatus> = {
  DRAFT: DischargeRecordStatus.Draft,
  PROCESSED: DischargeRecordStatus.Processed,
};

export const TO_PERSISTENCE_STATUS: Record<DischargeRecordStatus, PrismaStatus> = {
  [DischargeRecordStatus.Draft]: 'DRAFT',
  [DischargeRecordStatus.Processed]: 'PROCESSED',
};
