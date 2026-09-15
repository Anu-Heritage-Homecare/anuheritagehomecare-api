/**
 * A compliance acknowledgement the coordinator attests to before a formal discharge.
 * All must be present for a discharge to be processed; a hold does not require them.
 */
export enum DischargeAcknowledgement {
  FinalAssessmentFiled = 'FINAL_ASSESSMENT_FILED',
  ClinicalTasksResolved = 'CLINICAL_TASKS_RESOLVED',
  FamilyNotified = 'FAMILY_NOTIFIED',
  FinalInvoicesVerified = 'FINAL_INVOICES_VERIFIED',
  RecordsArchived = 'RECORDS_ARCHIVED',
}

/** Every acknowledgement; a discharge requires the full set. */
export const ALL_DISCHARGE_ACKNOWLEDGEMENTS: readonly DischargeAcknowledgement[] =
  Object.values(DischargeAcknowledgement);
