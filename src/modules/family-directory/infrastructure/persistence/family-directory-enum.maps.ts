import {
  FamilyDirectorySubjectKind as PrismaSubjectKind,
  FamilyMemberStatus as PrismaStatus,
} from '@prisma/client';
import { FamilyDirectorySubjectKind } from '../../domain/family-directory-subject-kind.enum';
import { FamilyMemberStatus } from '../../domain/family-member-status.enum';

export const TO_DOMAIN_SUBJECT_KIND: Record<PrismaSubjectKind, FamilyDirectorySubjectKind> = {
  ACCOUNT: FamilyDirectorySubjectKind.Account,
  CONTACT: FamilyDirectorySubjectKind.Contact,
};

export const TO_PERSISTENCE_SUBJECT_KIND: Record<FamilyDirectorySubjectKind, PrismaSubjectKind> = {
  [FamilyDirectorySubjectKind.Account]: 'ACCOUNT',
  [FamilyDirectorySubjectKind.Contact]: 'CONTACT',
};

export const TO_DOMAIN_STATUS: Record<PrismaStatus, FamilyMemberStatus> = {
  ACTIVE: FamilyMemberStatus.Active,
  INACTIVE: FamilyMemberStatus.Inactive,
  PENDING_VERIFICATION: FamilyMemberStatus.PendingVerification,
};

export const TO_PERSISTENCE_STATUS: Record<FamilyMemberStatus, PrismaStatus> = {
  [FamilyMemberStatus.Active]: 'ACTIVE',
  [FamilyMemberStatus.Inactive]: 'INACTIVE',
  [FamilyMemberStatus.PendingVerification]: 'PENDING_VERIFICATION',
};
