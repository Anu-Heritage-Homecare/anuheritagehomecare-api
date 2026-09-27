/** Whether a training course is finished or still under way. */
export enum CaregiverTrainingStatus {
  Completed = 'COMPLETED',
  InProgress = 'IN_PROGRESS',
}

export const ALL_CAREGIVER_TRAINING_STATUSES: CaregiverTrainingStatus[] =
  Object.values(CaregiverTrainingStatus);
