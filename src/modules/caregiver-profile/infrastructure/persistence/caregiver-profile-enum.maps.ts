import {
  CaregiverEmploymentType as PrismaEmploymentType,
  CaregiverStatus as PrismaStatus,
} from '@prisma/client';
import { CaregiverEmploymentType } from '../../domain/caregiver-employment-type.enum';
import { CaregiverStatus } from '../../domain/caregiver-status.enum';

export const TO_DOMAIN_EMPLOYMENT: Record<PrismaEmploymentType, CaregiverEmploymentType> = {
  FULL_TIME: CaregiverEmploymentType.FullTime,
  PART_TIME: CaregiverEmploymentType.PartTime,
  CONTRACT: CaregiverEmploymentType.Contract,
};

export const TO_PERSISTENCE_EMPLOYMENT: Record<CaregiverEmploymentType, PrismaEmploymentType> = {
  [CaregiverEmploymentType.FullTime]: 'FULL_TIME',
  [CaregiverEmploymentType.PartTime]: 'PART_TIME',
  [CaregiverEmploymentType.Contract]: 'CONTRACT',
};

export const TO_DOMAIN_STATUS: Record<PrismaStatus, CaregiverStatus> = {
  ACTIVE: CaregiverStatus.Active,
  INACTIVE: CaregiverStatus.Inactive,
  ON_LEAVE: CaregiverStatus.OnLeave,
};

export const TO_PERSISTENCE_STATUS: Record<CaregiverStatus, PrismaStatus> = {
  [CaregiverStatus.Active]: 'ACTIVE',
  [CaregiverStatus.Inactive]: 'INACTIVE',
  [CaregiverStatus.OnLeave]: 'ON_LEAVE',
};
