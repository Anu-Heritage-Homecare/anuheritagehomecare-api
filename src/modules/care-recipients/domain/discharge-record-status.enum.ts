/**
 * The lifecycle of a discharge record: a DRAFT the coordinator saves and revises,
 * and PROCESSED once the discharge or hold is formally executed (immutable after).
 */
export enum DischargeRecordStatus {
  Draft = 'DRAFT',
  Processed = 'PROCESSED',
}
