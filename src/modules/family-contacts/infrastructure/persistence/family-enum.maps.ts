import {
  FamilyAccessLevel as PrismaAccessLevel,
  FamilyCommunicationType as PrismaCommunicationType,
  FamilyContactRole as PrismaRole,
  FamilyPreferredContactMethod as PrismaPreferredMethod,
} from '@prisma/client';
import { FamilyAccessLevel } from '../../domain/family-access-level.enum';
import { FamilyCommunicationType } from '../../domain/family-communication-type.enum';
import { FamilyContactRole } from '../../domain/family-contact-role.enum';
import { FamilyPreferredContactMethod } from '../../domain/family-preferred-contact-method.enum';

export const TO_DOMAIN_ROLE: Record<PrismaRole, FamilyContactRole> = {
  PRIMARY_CONTACT: FamilyContactRole.PrimaryContact,
  SECONDARY_CONTACT: FamilyContactRole.SecondaryContact,
  EMERGENCY_CONTACT: FamilyContactRole.EmergencyContact,
  POWER_OF_ATTORNEY: FamilyContactRole.PowerOfAttorney,
  BILLING_CONTACT: FamilyContactRole.BillingContact,
  MEDICAL_DECISION_BACKUP: FamilyContactRole.MedicalDecisionBackup,
  VISIT_COMPANION: FamilyContactRole.VisitCompanion,
};

export const TO_PERSISTENCE_ROLE: Record<FamilyContactRole, PrismaRole> = {
  [FamilyContactRole.PrimaryContact]: 'PRIMARY_CONTACT',
  [FamilyContactRole.SecondaryContact]: 'SECONDARY_CONTACT',
  [FamilyContactRole.EmergencyContact]: 'EMERGENCY_CONTACT',
  [FamilyContactRole.PowerOfAttorney]: 'POWER_OF_ATTORNEY',
  [FamilyContactRole.BillingContact]: 'BILLING_CONTACT',
  [FamilyContactRole.MedicalDecisionBackup]: 'MEDICAL_DECISION_BACKUP',
  [FamilyContactRole.VisitCompanion]: 'VISIT_COMPANION',
};

export const TO_DOMAIN_ACCESS_LEVEL: Record<PrismaAccessLevel, FamilyAccessLevel> = {
  FULL_ACCESS: FamilyAccessLevel.FullAccess,
  VIEW_ONLY: FamilyAccessLevel.ViewOnly,
  LIMITED: FamilyAccessLevel.Limited,
};

export const TO_PERSISTENCE_ACCESS_LEVEL: Record<FamilyAccessLevel, PrismaAccessLevel> = {
  [FamilyAccessLevel.FullAccess]: 'FULL_ACCESS',
  [FamilyAccessLevel.ViewOnly]: 'VIEW_ONLY',
  [FamilyAccessLevel.Limited]: 'LIMITED',
};

export const TO_DOMAIN_PREFERRED_METHOD: Record<
  PrismaPreferredMethod,
  FamilyPreferredContactMethod
> = {
  PHONE: FamilyPreferredContactMethod.Phone,
  APP_MESSAGE: FamilyPreferredContactMethod.AppMessage,
  SMS_TEXT: FamilyPreferredContactMethod.SmsText,
  VIDEO_CALL: FamilyPreferredContactMethod.VideoCall,
  EMAIL: FamilyPreferredContactMethod.Email,
};

export const TO_PERSISTENCE_PREFERRED_METHOD: Record<
  FamilyPreferredContactMethod,
  PrismaPreferredMethod
> = {
  [FamilyPreferredContactMethod.Phone]: 'PHONE',
  [FamilyPreferredContactMethod.AppMessage]: 'APP_MESSAGE',
  [FamilyPreferredContactMethod.SmsText]: 'SMS_TEXT',
  [FamilyPreferredContactMethod.VideoCall]: 'VIDEO_CALL',
  [FamilyPreferredContactMethod.Email]: 'EMAIL',
};

export const TO_DOMAIN_COMMUNICATION_TYPE: Record<
  PrismaCommunicationType,
  FamilyCommunicationType
> = {
  APP_MESSAGE: FamilyCommunicationType.AppMessage,
  PHONE_CALL: FamilyCommunicationType.PhoneCall,
  IN_PERSON: FamilyCommunicationType.InPerson,
  EMAIL: FamilyCommunicationType.Email,
  VIDEO_CALL: FamilyCommunicationType.VideoCall,
  SMS_TEXT: FamilyCommunicationType.SmsText,
};

export const TO_PERSISTENCE_COMMUNICATION_TYPE: Record<
  FamilyCommunicationType,
  PrismaCommunicationType
> = {
  [FamilyCommunicationType.AppMessage]: 'APP_MESSAGE',
  [FamilyCommunicationType.PhoneCall]: 'PHONE_CALL',
  [FamilyCommunicationType.InPerson]: 'IN_PERSON',
  [FamilyCommunicationType.Email]: 'EMAIL',
  [FamilyCommunicationType.VideoCall]: 'VIDEO_CALL',
  [FamilyCommunicationType.SmsText]: 'SMS_TEXT',
};
