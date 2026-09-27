import { CaregiverTraining } from './caregiver-training.entity';

/** Persistence port for caregiver training records. */
export interface CaregiverTrainingRepository {
  save(training: CaregiverTraining): Promise<void>;
  findById(id: string): Promise<CaregiverTraining | null>;
  listForCaregiver(caregiverId: string): Promise<CaregiverTraining[]>;
}

export const CAREGIVER_TRAINING_REPOSITORY = Symbol('CAREGIVER_TRAINING_REPOSITORY');
