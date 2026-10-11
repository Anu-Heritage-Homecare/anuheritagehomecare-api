-- CreateSchema
-- The "public" schema already exists on the managed CloudClusters database and
-- the application role lacks database level CREATE, so creating it is skipped.
-- CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "client_status" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "login_outcome" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateEnum
CREATE TYPE "user_type" AS ENUM ('CAREGIVER', 'FAMILY_MEMBER');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "country" AS ENUM ('US', 'NG');

-- CreateEnum
CREATE TYPE "verification_purpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "medication_status" AS ENUM ('ACTIVE', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "health_event_category" AS ENUM ('VITALS', 'ALERT', 'MEDICATION', 'INCIDENT', 'ASSESSMENT', 'APPOINTMENT', 'SPECIALIST', 'CARE');

-- CreateEnum
CREATE TYPE "care_team_role" AS ENUM ('PRIMARY', 'BACKUP', 'COORDINATOR');

-- CreateEnum
CREATE TYPE "care_team_action" AS ENUM ('ASSIGNED', 'REMOVED');

-- CreateEnum
CREATE TYPE "coverage_slot" AS ENUM ('MORNING', 'AFTERNOON');

-- CreateEnum
CREATE TYPE "document_category" AS ENUM ('MEDICAL_RECORDS', 'CARE_PLANS', 'LEGAL', 'INSURANCE', 'CERTIFICATIONS', 'PHOTOS');

-- CreateEnum
CREATE TYPE "document_status" AS ENUM ('CURRENT', 'PENDING_REVIEW', 'VERIFIED');

-- CreateEnum
CREATE TYPE "recipient_invoice_status" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "note_category" AS ENUM ('VISIT_NOTE', 'CLINICAL', 'COORDINATOR', 'FAMILY_COMMUNICATION', 'INCIDENT');

-- CreateEnum
CREATE TYPE "family_contact_role" AS ENUM ('PRIMARY_CONTACT', 'SECONDARY_CONTACT', 'EMERGENCY_CONTACT', 'POWER_OF_ATTORNEY', 'BILLING_CONTACT', 'MEDICAL_DECISION_BACKUP', 'VISIT_COMPANION');

-- CreateEnum
CREATE TYPE "family_access_level" AS ENUM ('FULL_ACCESS', 'VIEW_ONLY', 'LIMITED');

-- CreateEnum
CREATE TYPE "family_preferred_contact_method" AS ENUM ('PHONE', 'APP_MESSAGE', 'SMS_TEXT', 'VIDEO_CALL', 'EMAIL');

-- CreateEnum
CREATE TYPE "family_communication_type" AS ENUM ('APP_MESSAGE', 'PHONE_CALL', 'IN_PERSON', 'EMAIL', 'VIDEO_CALL', 'SMS_TEXT');

-- CreateEnum
CREATE TYPE "discharge_action" AS ENUM ('HOLD', 'DISCHARGE');

-- CreateEnum
CREATE TYPE "discharge_reason" AS ENUM ('CARE_NO_LONGER_NEEDED', 'RESIDENTIAL_FACILITY_TRANSITION', 'RELOCATION_OUT_OF_COVERAGE', 'DECEASED', 'HOSPITALIZATION', 'FAMILY_TRAVEL', 'TEMPORARY_RELOCATION', 'OTHER');

-- CreateEnum
CREATE TYPE "discharge_acknowledgement" AS ENUM ('FINAL_ASSESSMENT_FILED', 'CLINICAL_TASKS_RESOLVED', 'FAMILY_NOTIFIED', 'FINAL_INVOICES_VERIFIED', 'RECORDS_ARCHIVED');

-- CreateEnum
CREATE TYPE "discharge_record_status" AS ENUM ('DRAFT', 'PROCESSED');

-- CreateEnum
CREATE TYPE "care_goal_status" AS ENUM ('ON_TRACK', 'NEEDS_ATTENTION', 'AT_RISK', 'ACHIEVED');

-- CreateEnum
CREATE TYPE "care_instruction_category" AS ENUM ('MEDICAL', 'BEHAVIORAL');

-- CreateEnum
CREATE TYPE "care_instruction_severity" AS ENUM ('CRITICAL', 'WARNING', 'NORMAL');

-- CreateEnum
CREATE TYPE "care_recipient_status" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'DISCHARGED');

-- CreateEnum
CREATE TYPE "care_recipient_priority" AS ENUM ('CRITICAL', 'URGENT', 'HIGH', 'MEDIUM', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "care_need" AS ENUM ('BATHING', 'DRESSING', 'GROOMING', 'TOILETING', 'MEAL_PREPARATION', 'HOUSEKEEPING', 'LAUNDRY', 'SHOPPING');

-- CreateEnum
CREATE TYPE "care_frequency" AS ENUM ('ONE_TIME_VISIT', 'DAILY', 'WEEKLY', 'LIVE_IN_CARE');

-- CreateEnum
CREATE TYPE "weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "onboarding_step" AS ENUM ('PROFILE', 'CARE_NEEDS', 'HEALTH', 'SCHEDULE', 'REVIEW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "note_audience" AS ENUM ('CARE_TEAM', 'FAMILY');

-- CreateEnum
CREATE TYPE "medication_administration_outcome" AS ENUM ('ADMINISTERED', 'REFUSED', 'OUT_OF_STOCK', 'PATIENT_ASLEEP');

-- CreateEnum
CREATE TYPE "sos_alert_status" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "currency" AS ENUM ('USD', 'NGN');

-- CreateEnum
CREATE TYPE "care_access_level" AS ENUM ('LIMITED', 'VIEW_ONLY', 'FULL');

-- CreateEnum
CREATE TYPE "care_code_status" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('ISSUED', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "billing_model" AS ENUM ('HOURLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "care_plan_type" AS ENUM ('FLEXIBLE', 'STANDARD_MONTHLY', 'PREMIUM', 'LIVE_IN');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "visit_status" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'ON_BREAK', 'COMPLETED', 'CANCELLED', 'MISSED');

-- CreateEnum
CREATE TYPE "visit_type" AS ENUM ('PERSONAL_CARE', 'MORNING_CARE', 'MEDICATION', 'PHYSICAL_THERAPY', 'WOUND_CARE', 'COMPANIONSHIP');

-- CreateEnum
CREATE TYPE "visit_priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "holiday_policy" AS ENUM ('CLOSED', 'EMERGENCY_ONLY', 'OPEN');

-- CreateEnum
CREATE TYPE "location_mode" AS ENUM ('NAVIGATION', 'BACKGROUND', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'PAUSED', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "payment_provider" AS ENUM ('STRIPE', 'PAYSTACK');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "payable_type" AS ENUM ('BOOKING', 'SUBSCRIPTION', 'INVOICE');

-- CreateEnum
CREATE TYPE "care_request_status" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "onboarding_stage" AS ENUM ('NEW_REQUEST', 'PLAN_SELECTED', 'PAYMENT_RECEIVED', 'PENDING_REVIEW', 'DOC_VERIFIED', 'COORDINATOR_ASSIGNED', 'CAREGIVER_SCHEDULED', 'SUB_ACTIVATED');

-- CreateEnum
CREATE TYPE "onboarding_status" AS ENUM ('PENDING', 'UNDER_REVIEW', 'NEEDS_INFO', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "onboarding_payment_status" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "onboarding_priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "docs_status" AS ENUM ('COMPLETE', 'INCOMPLETE', 'MISSING');

-- CreateEnum
CREATE TYPE "managed_plan_status" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "billing_cycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "subscription_ops_event_type" AS ENUM ('CREATED', 'ACTIVATED', 'RENEWAL_COMPLETED', 'HOURS_ADDED', 'HOURS_ADJUSTED', 'EXPIRY_EXTENDED', 'PAUSED', 'RESUMED', 'CANCELLED', 'AUTO_RENEW_ENABLED', 'AUTO_RENEW_DISABLED', 'COORDINATOR_ASSIGNED', 'CAREGIVER_ASSIGNED', 'PLAN_CHANGED');

-- CreateEnum
CREATE TYPE "family_directory_subject_kind" AS ENUM ('ACCOUNT', 'CONTACT');

-- CreateEnum
CREATE TYPE "family_member_status" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "caregiver_note_kind" AS ENUM ('SUPERVISOR', 'INTERNAL', 'TRAINING');

-- CreateEnum
CREATE TYPE "caregiver_employment_type" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT');

-- CreateEnum
CREATE TYPE "caregiver_status" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "kyc_provider" AS ENUM ('STRIPE', 'QOREID');

-- CreateEnum
CREATE TYPE "kyc_status" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "kyc_document_type" AS ENUM ('NIN', 'DRIVERS_LICENSE', 'PASSPORT');

-- CreateEnum
CREATE TYPE "face_match_outcome" AS ENUM ('MATCH', 'NO_MATCH', 'NOT_AVAILABLE');

-- CreateEnum
CREATE TYPE "admin_role" AS ENUM ('SUPER_ADMIN', 'OPERATIONS_MANAGER', 'COORDINATOR');

-- CreateEnum
CREATE TYPE "admin_status" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "alert_type" AS ENUM ('LATE_CAREGIVER', 'MISSED_CLOCK_IN', 'VISIT_OVERDUE', 'LOCATION_VERIFICATION_FAILED', 'CERTIFICATION_EXPIRING', 'MEDICATION_ISSUE', 'GENERAL');

-- CreateEnum
CREATE TYPE "alert_severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "alert_status" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "task_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "rating_reviewer_type" AS ENUM ('FAMILY', 'COORDINATOR');

-- CreateEnum
CREATE TYPE "credential_kind" AS ENUM ('LICENSE', 'CERTIFICATION', 'BACKGROUND_CHECK', 'HEALTH_SCREENING', 'OTHER');

-- CreateEnum
CREATE TYPE "caregiver_document_category" AS ENUM ('LEGAL', 'TAX', 'PAYROLL', 'HR', 'OTHER');

-- CreateEnum
CREATE TYPE "caregiver_document_status" AS ENUM ('ACTIVE', 'CURRENT', 'VERIFIED', 'SIGNED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "caregiver_training_status" AS ENUM ('COMPLETED', 'IN_PROGRESS');

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "status" "client_status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "userType" "user_type" NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "addressLine1" VARCHAR(200) NOT NULL,
    "addressLine2" VARCHAR(200),
    "city" VARCHAR(120) NOT NULL,
    "state" VARCHAR(120) NOT NULL,
    "postalCode" VARCHAR(20) NOT NULL,
    "country" "country" NOT NULL,
    "dateOfBirth" DATE,
    "relationshipToRecipient" VARCHAR(120),
    "passwordHash" VARCHAR(255) NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "photoKey" VARCHAR(500),
    "isFamilyOwner" BOOLEAN NOT NULL DEFAULT false,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" VARCHAR(255),
    "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "biometricEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 15,
    "status" "user_status" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "two_factor_recovery_codes" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "codeHash" VARCHAR(255) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factor_recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_codes" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "purpose" "verification_purpose" NOT NULL,
    "codeHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "deviceLabel" VARCHAR(120) NOT NULL,
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(400),
    "currentTokenHash" VARCHAR(255),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_events" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "outcome" "login_outcome" NOT NULL,
    "deviceLabel" VARCHAR(120),
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(400),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_recipients" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "status" "care_recipient_status" NOT NULL DEFAULT 'DRAFT',
    "onboardingStep" "onboarding_step" NOT NULL DEFAULT 'CARE_NEEDS',
    "name" VARCHAR(200) NOT NULL,
    "gender" "gender" NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "state" VARCHAR(120) NOT NULL,
    "fullAddress" VARCHAR(300) NOT NULL,
    "relationship" VARCHAR(120) NOT NULL,
    "livingSituation" VARCHAR(120) NOT NULL,
    "photoKey" VARCHAR(500),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "careNeeds" "care_need"[] DEFAULT ARRAY[]::"care_need"[],
    "medicalConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "needsMedicationHelp" BOOLEAN,
    "careFrequency" "care_frequency",
    "estimatedStartDate" DATE,
    "expectedDuration" VARCHAR(120),
    "careDays" "weekday"[] DEFAULT ARRAY[]::"weekday"[],
    "careStartMinute" INTEGER,
    "careVisitDurationMinutes" INTEGER,
    "recipientNumber" SERIAL NOT NULL,
    "priority" "care_recipient_priority" NOT NULL DEFAULT 'NORMAL',
    "primaryCaregiverId" UUID,
    "completedAt" TIMESTAMP(3),
    "dischargedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "dose" VARCHAR(60),
    "scheduleMinute" INTEGER,
    "purpose" VARCHAR(300),
    "prescribedBy" VARCHAR(120),
    "startDate" DATE,
    "instructions" VARCHAR(300),
    "doseTimes" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "status" "medication_status" NOT NULL DEFAULT 'ACTIVE',
    "discontinuedAt" TIMESTAMP(3),
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_goals" (
    "id" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "achieved" BOOLEAN NOT NULL DEFAULT false,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "status" "care_goal_status" NOT NULL DEFAULT 'ON_TRACK',
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plan_schedule_blocks" (
    "id" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_plan_schedule_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_instructions" (
    "id" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "category" "care_instruction_category" NOT NULL,
    "text" VARCHAR(300) NOT NULL,
    "severity" "care_instruction_severity" NOT NULL DEFAULT 'NORMAL',
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_instructions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plan_revisions" (
    "id" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "authorAdminId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_plan_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_warnings" (
    "id" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "detail" VARCHAR(1000) NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medication_warnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_audits" (
    "id" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "detail" VARCHAR(1000) NOT NULL,
    "authorAdminId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medication_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_events" (
    "id" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "category" "health_event_category" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "recordedByName" VARCHAR(120),
    "recordedByRole" VARCHAR(120),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "authorAdminId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_team_assignments" (
    "id" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "caregiverId" UUID NOT NULL,
    "role" "care_team_role" NOT NULL,
    "specialization" VARCHAR(200),
    "scheduleLabel" VARCHAR(200),
    "assignedAt" TIMESTAMP(3) NOT NULL,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_team_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_team_assignment_events" (
    "id" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "caregiverId" UUID NOT NULL,
    "action" "care_team_action" NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "byAdminId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_team_assignment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coverage_blocks" (
    "id" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "weekday" "weekday" NOT NULL,
    "slot" "coverage_slot" NOT NULL,
    "caregiverId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coverage_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipient_documents" (
    "id" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "category" "document_category" NOT NULL,
    "storageKey" VARCHAR(500) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedByName" VARCHAR(120),
    "status" "document_status" NOT NULL DEFAULT 'CURRENT',
    "expiresAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipient_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipient_invoices" (
    "id" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "sequence" SERIAL NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "servicesLabel" VARCHAR(300) NOT NULL,
    "currency" "currency" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "insuranceCoveredMinor" INTEGER NOT NULL,
    "status" "recipient_invoice_status" NOT NULL DEFAULT 'PENDING',
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "dueDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipient_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipient_invoice_lines" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "serviceName" VARCHAR(120) NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "recipient_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipient_invoice_payments" (
    "id" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "invoiceId" UUID,
    "amountMinor" INTEGER NOT NULL,
    "currency" "currency" NOT NULL,
    "methodLabel" VARCHAR(120),
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipient_invoice_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_profiles" (
    "id" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "billingContactName" VARCHAR(200),
    "billingContactRelationship" VARCHAR(200),
    "billingContactEmail" VARCHAR(200),
    "billingContactPhone" VARCHAR(200),
    "paymentMethodBrand" VARCHAR(200),
    "paymentMethodLast4" VARCHAR(4),
    "autoPayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "primaryInsuranceProvider" VARCHAR(200),
    "primaryInsurancePolicyNumber" VARCHAR(200),
    "primaryInsuranceCoveragePercent" INTEGER,
    "primaryInsuranceCoverageDetails" VARCHAR(500),
    "coPayPerVisitMinor" INTEGER,
    "coPayCurrency" "currency",
    "secondaryInsurance" VARCHAR(500),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_notes" (
    "id" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "category" "note_category" NOT NULL,
    "content" VARCHAR(4000) NOT NULL,
    "authorName" VARCHAR(120) NOT NULL,
    "authorRole" VARCHAR(120),
    "attachmentKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "flaggedForReview" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedByAdminId" UUID,
    "authorAdminId" UUID,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_comments" (
    "id" UUID NOT NULL,
    "noteId" UUID NOT NULL,
    "authorName" VARCHAR(120) NOT NULL,
    "authorRole" VARCHAR(120),
    "content" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_contacts" (
    "id" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "relationship" VARCHAR(120) NOT NULL,
    "roles" "family_contact_role"[] DEFAULT ARRAY[]::"family_contact_role"[],
    "roleNote" VARCHAR(200),
    "phone" VARCHAR(200),
    "email" VARCHAR(200),
    "address" VARCHAR(500),
    "accessLevel" "family_access_level" NOT NULL DEFAULT 'VIEW_ONLY',
    "accessScopeLabel" VARCHAR(200),
    "authorizedSectionsLabel" VARCHAR(500),
    "preferredMethod" "family_preferred_contact_method",
    "portalLoginEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_communications" (
    "id" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "familyContactId" UUID NOT NULL,
    "type" "family_communication_type" NOT NULL,
    "subject" VARCHAR(300) NOT NULL,
    "staffMemberName" VARCHAR(120) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discharge_records" (
    "id" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "action" "discharge_action" NOT NULL,
    "reason" "discharge_reason",
    "effectiveDate" DATE,
    "clinicalSummary" VARCHAR(4000),
    "acknowledgements" "discharge_acknowledgement"[] DEFAULT ARRAY[]::"discharge_acknowledgement"[],
    "status" "discharge_record_status" NOT NULL DEFAULT 'DRAFT',
    "processedByAdminId" UUID,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discharge_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plans" (
    "id" UUID NOT NULL,
    "type" "care_plan_type" NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "billingModel" "billing_model" NOT NULL,
    "allowedHours" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plan_prices" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "currency" "currency" NOT NULL,
    "unitAmountMinor" INTEGER NOT NULL,
    "serviceFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "stripePriceId" VARCHAR(200),
    "paystackPlanCode" VARCHAR(200),

    CONSTRAINT "care_plan_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "planType" "care_plan_type" NOT NULL,
    "hours" INTEGER NOT NULL,
    "serviceDate" DATE NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "currency" "currency" NOT NULL,
    "hourlyRateMinor" INTEGER NOT NULL,
    "subtotalMinor" INTEGER NOT NULL,
    "serviceFeeMinor" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "status" "booking_status" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" UUID NOT NULL,
    "caregiverId" UUID,
    "assignedAt" TIMESTAMP(3),
    "careRecipientId" UUID NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "visitType" "visit_type" NOT NULL DEFAULT 'PERSONAL_CARE',
    "priority" "visit_priority" NOT NULL DEFAULT 'NORMAL',
    "status" "visit_status" NOT NULL DEFAULT 'SCHEDULED',
    "specialInstructions" TEXT[],
    "clockInAt" TIMESTAMP(3),
    "clockOutAt" TIMESTAMP(3),
    "arrivalLatitude" DOUBLE PRECISION,
    "arrivalLongitude" DOUBLE PRECISION,
    "photoKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "observationMood" VARCHAR(120),
    "observationAppetite" VARCHAR(120),
    "observationMobility" VARCHAR(120),
    "observationMedication" VARCHAR(120),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_notes" (
    "id" UUID NOT NULL,
    "visitId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "audience" "note_audience" NOT NULL DEFAULT 'FAMILY',
    "text" VARCHAR(4000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_breaks" (
    "id" UUID NOT NULL,
    "visitId" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "visit_breaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_administrations" (
    "id" UUID NOT NULL,
    "visitId" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "outcome" "medication_administration_outcome" NOT NULL,
    "note" VARCHAR(500),
    "recordedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_administrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_vitals" (
    "id" UUID NOT NULL,
    "visitId" UUID NOT NULL,
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "heartRate" INTEGER,
    "oxygenSaturation" INTEGER,
    "weightGrams" INTEGER,
    "temperatureTenths" INTEGER,
    "bloodGlucose" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visit_vitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_alerts" (
    "id" UUID NOT NULL,
    "caregiverId" UUID NOT NULL,
    "visitId" UUID NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "careRecipientId" UUID NOT NULL,
    "recipientName" VARCHAR(200),
    "recipientAddress" VARCHAR(300),
    "recipientLatitude" DOUBLE PRECISION,
    "recipientLongitude" DOUBLE PRECISION,
    "status" "sos_alert_status" NOT NULL DEFAULT 'ACTIVE',
    "dispatchedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sos_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_tasks" (
    "id" UUID NOT NULL,
    "visitId" UUID NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "position" INTEGER NOT NULL,

    CONSTRAINT "visit_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "planType" "care_plan_type" NOT NULL,
    "startDate" DATE NOT NULL,
    "currency" "currency" NOT NULL,
    "monthlyPriceMinor" INTEGER NOT NULL,
    "status" "subscription_status" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "userId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "relationship" VARCHAR(120) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "care_circle_members" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "memberUserId" UUID NOT NULL,
    "relationship" VARCHAR(120) NOT NULL,
    "accessLevel" "care_access_level" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_circle_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_codes" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "status" "care_code_status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_preferences" (
    "userId" UUID NOT NULL,
    "visitUpdates" BOOLEAN NOT NULL DEFAULT true,
    "caregiverUpdates" BOOLEAN NOT NULL DEFAULT true,
    "healthAlerts" BOOLEAN NOT NULL DEFAULT true,
    "medicationReminders" BOOLEAN NOT NULL DEFAULT true,
    "messages" BOOLEAN NOT NULL DEFAULT true,
    "carePlanUpdates" BOOLEAN NOT NULL DEFAULT true,
    "announcements" BOOLEAN NOT NULL DEFAULT true,
    "invoicesAndPayments" BOOLEAN NOT NULL DEFAULT true,
    "paymentReminders" BOOLEAN NOT NULL DEFAULT true,
    "marketingAndOffers" BOOLEAN NOT NULL DEFAULT false,
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "preferredContactMethod" VARCHAR(10) NOT NULL DEFAULT 'EMAIL',
    "theme" VARCHAR(10) NOT NULL DEFAULT 'LIGHT',
    "dateFormat" VARCHAR(20) NOT NULL DEFAULT 'MMM_DD_YYYY',
    "timeFormat" VARCHAR(20) NOT NULL DEFAULT 'TWELVE_HOUR',
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "textSize" VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_preferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "calendar_feeds" (
    "userId" UUID NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_feeds_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "number" VARCHAR(40) NOT NULL,
    "currency" "currency" NOT NULL,
    "subtotalMinor" INTEGER NOT NULL,
    "taxRateBps" INTEGER NOT NULL DEFAULT 0,
    "taxMinor" INTEGER NOT NULL DEFAULT 0,
    "discountMinor" INTEGER NOT NULL DEFAULT 0,
    "amountMinor" INTEGER NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "invoice_status" NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduling_settings" (
    "id" TEXT NOT NULL,
    "businessHours" JSONB NOT NULL,
    "defaultDurations" JSONB NOT NULL,
    "requireCertificationMatch" BOOLEAN NOT NULL DEFAULT true,
    "autoAssignPreferredCaregiver" BOOLEAN NOT NULL DEFAULT true,
    "allowOvertimeScheduling" BOOLEAN NOT NULL DEFAULT false,
    "requireCoordinatorApprovalForUrgent" BOOLEAN NOT NULL DEFAULT true,
    "sendRemindersOneHourBefore" BOOLEAN NOT NULL DEFAULT true,
    "autoCancelUnconfirmedAfter24h" BOOLEAN NOT NULL DEFAULT false,
    "minBufferMinutes" INTEGER NOT NULL DEFAULT 30,
    "travelTimeEstimation" BOOLEAN NOT NULL DEFAULT true,
    "maxTravelDistanceMiles" INTEGER NOT NULL DEFAULT 25,
    "allowBackToBackVisits" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduling_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduling_holidays" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "date" DATE NOT NULL,
    "policy" "holiday_policy" NOT NULL DEFAULT 'CLOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduling_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_pings" (
    "id" UUID NOT NULL,
    "caregiverId" UUID NOT NULL,
    "visitId" UUID,
    "sosAlertId" UUID,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracyMeters" DOUBLE PRECISION,
    "mode" "location_mode" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_pings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "payableType" "payable_type" NOT NULL,
    "payableId" UUID NOT NULL,
    "provider" "payment_provider" NOT NULL,
    "providerReference" VARCHAR(200) NOT NULL,
    "currency" "currency" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "provider" "payment_provider" NOT NULL,
    "providerCustomerRef" VARCHAR(200),
    "providerMethodRef" VARCHAR(200) NOT NULL,
    "brand" VARCHAR(40) NOT NULL,
    "last4" VARCHAR(4) NOT NULL,
    "expMonth" INTEGER NOT NULL,
    "expYear" INTEGER NOT NULL,
    "cardHolderName" VARCHAR(200),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregiver_pay_rates" (
    "id" UUID NOT NULL,
    "caregiverId" UUID NOT NULL,
    "currency" "currency" NOT NULL,
    "hourlyRateMinor" INTEGER NOT NULL,
    "overtimeMultiplierBps" INTEGER NOT NULL DEFAULT 15000,
    "regularHoursCap" INTEGER NOT NULL DEFAULT 80,
    "weekendBonusMinor" INTEGER NOT NULL DEFAULT 0,
    "taxRateBps" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caregiver_pay_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" UUID NOT NULL,
    "caregiverId" UUID NOT NULL,
    "currency" "currency" NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "payDay" DATE NOT NULL,
    "workedMinutes" INTEGER NOT NULL,
    "regularMinutes" INTEGER NOT NULL,
    "regularPayMinor" INTEGER NOT NULL,
    "overtimeMinutes" INTEGER NOT NULL,
    "overtimePayMinor" INTEGER NOT NULL,
    "weekendVisits" INTEGER NOT NULL,
    "weekendBonusMinor" INTEGER NOT NULL,
    "grossMinor" INTEGER NOT NULL,
    "deductionsMinor" INTEGER NOT NULL,
    "netMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregiver_availability" (
    "id" UUID NOT NULL,
    "caregiverId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caregiver_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregiver_availability_slots" (
    "id" UUID NOT NULL,
    "availabilityId" UUID NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,

    CONSTRAINT "caregiver_availability_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "additional_care_requests" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "careRecipientId" UUID NOT NULL,
    "careType" VARCHAR(100) NOT NULL,
    "requestedDate" DATE NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "reason" VARCHAR(1000),
    "status" "care_request_status" NOT NULL DEFAULT 'PENDING',
    "actionedByAdminId" UUID,
    "actionedAt" TIMESTAMP(3),
    "decisionNote" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "additional_care_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_applications" (
    "id" UUID NOT NULL,
    "sequence" SERIAL NOT NULL,
    "ownerId" UUID,
    "careRecipientId" UUID,
    "familyName" VARCHAR(200) NOT NULL,
    "patientName" VARCHAR(200) NOT NULL,
    "selectedPlanType" "care_plan_type",
    "currency" "currency" NOT NULL,
    "monthlyPriceMinor" INTEGER,
    "priority" "onboarding_priority" NOT NULL DEFAULT 'MEDIUM',
    "paymentStatus" "onboarding_payment_status" NOT NULL DEFAULT 'PENDING',
    "docsStatus" "docs_status" NOT NULL DEFAULT 'MISSING',
    "coordinatorId" UUID,
    "caregiverId" UUID,
    "stage" "onboarding_stage" NOT NULL DEFAULT 'NEW_REQUEST',
    "status" "onboarding_status" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "activatedSubscriptionId" UUID,
    "patientDateOfBirth" DATE,
    "patientGender" VARCHAR(20),
    "patientConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contactName" VARCHAR(200),
    "contactPhone" VARCHAR(40),
    "contactEmail" VARCHAR(255),
    "contactAddress" VARCHAR(400),
    "requestedHoursPerWeek" INTEGER,
    "requestedSchedule" VARCHAR(300),
    "specialNeeds" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_application_documents" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "key" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_application_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_lifecycle_events" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "stage" "onboarding_stage" NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_lifecycle_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "managed_care_plans" (
    "id" UUID NOT NULL,
    "coreType" "care_plan_type",
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "targetAudience" VARCHAR(300),
    "billingModel" "billing_model" NOT NULL,
    "status" "managed_plan_status" NOT NULL DEFAULT 'ACTIVE',
    "countriesEnabled" "country"[] DEFAULT ARRAY[]::"country"[],
    "supportedCurrencies" "currency"[] DEFAULT ARRAY[]::"currency"[],
    "minimumBillingHours" INTEGER,
    "autoRenewal" BOOLEAN NOT NULL DEFAULT true,
    "billingCycle" "billing_cycle" NOT NULL DEFAULT 'MONTHLY',
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 7,
    "cancellationNoticeDays" INTEGER NOT NULL DEFAULT 30,
    "services" JSONB NOT NULL DEFAULT '[]',
    "volumeDiscounts" JSONB NOT NULL DEFAULT '[]',
    "coverageAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eligibilityRules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "managed_care_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "managed_care_plan_prices" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "currency" "currency" NOT NULL,
    "monthlyPriceMinor" INTEGER,
    "baseRateMinor" INTEGER,
    "emergencyDispatchRateMinor" INTEGER,
    "weekendPremiumMinor" INTEGER,

    CONSTRAINT "managed_care_plan_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "managed_care_plan_versions" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "summary" VARCHAR(300) NOT NULL,
    "changedByAdminId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "managed_care_plan_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_ops" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "coordinatorId" UUID,
    "caregiverId" UUID,
    "contractStartAt" DATE,
    "activatedAt" DATE,
    "flexAllocatedTenths" INTEGER,
    "flexConsumedTenths" INTEGER,
    "flexCycleEndsAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_ops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_ops_events" (
    "id" UUID NOT NULL,
    "opsId" UUID NOT NULL,
    "type" "subscription_ops_event_type" NOT NULL,
    "detail" VARCHAR(300) NOT NULL,
    "hoursDeltaTenths" INTEGER,
    "actorAdminId" UUID,
    "actorLabel" VARCHAR(80),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_ops_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_ops_notes" (
    "id" UUID NOT NULL,
    "opsId" UUID NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "authorAdminId" UUID,
    "authorName" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_ops_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_directory_entries" (
    "id" UUID NOT NULL,
    "sequence" SERIAL NOT NULL,
    "subjectKind" "family_directory_subject_kind" NOT NULL,
    "userId" UUID,
    "fullName" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(40),
    "email" VARCHAR(255),
    "relationship" VARCHAR(120),
    "primaryRecipientId" UUID,
    "status" "family_member_status" NOT NULL DEFAULT 'ACTIVE',
    "quickNotes" VARCHAR(1000),
    "emergencyContactVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_directory_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregiver_profiles" (
    "id" UUID NOT NULL,
    "sequence" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "title" VARCHAR(120),
    "gender" "gender",
    "branch" VARCHAR(120),
    "supervisorName" VARCHAR(200),
    "employmentType" "caregiver_employment_type",
    "experienceYears" INTEGER,
    "joinedAt" DATE,
    "status" "caregiver_status" NOT NULL DEFAULT 'ACTIVE',
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emergencyContactName" VARCHAR(200),
    "emergencyContactPhone" VARCHAR(40),
    "emergencyContactRelationship" VARCHAR(80),
    "emergencyContactEmail" VARCHAR(255),
    "maxHoursPerWeek" INTEGER,
    "preferredShift" VARCHAR(40),
    "preferencesNote" TEXT,
    "areasForGrowth" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caregiver_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregiver_profile_notes" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "kind" "caregiver_note_kind" NOT NULL DEFAULT 'INTERNAL',
    "authorAdminId" UUID,
    "authorName" VARCHAR(200),
    "authorRole" VARCHAR(120),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caregiver_profile_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_verifications" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "country" "country" NOT NULL,
    "provider" "kyc_provider" NOT NULL,
    "documentType" "kyc_document_type",
    "claimedFirstName" VARCHAR(100) NOT NULL,
    "claimedLastName" VARCHAR(100) NOT NULL,
    "claimedDateOfBirth" DATE NOT NULL,
    "maskedReference" VARCHAR(20),
    "providerReference" VARCHAR(200),
    "faceMatch" "face_match_outcome",
    "mismatches" JSONB,
    "status" "kyc_status" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "admin_role" NOT NULL DEFAULT 'COORDINATOR',
    "status" "admin_status" NOT NULL DEFAULT 'ACTIVE',
    "photoKey" VARCHAR(500),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" UUID NOT NULL,
    "adminUserId" UUID NOT NULL,
    "deviceLabel" VARCHAR(120) NOT NULL,
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(400),
    "currentTokenHash" VARCHAR(64),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_alerts" (
    "id" UUID NOT NULL,
    "type" "alert_type" NOT NULL,
    "severity" "alert_severity" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "coordinatorName" VARCHAR(120),
    "status" "alert_status" NOT NULL DEFAULT 'OPEN',
    "relatedVisitId" UUID,
    "relatedCaregiverId" UUID,
    "relatedCareRecipientId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByAdminId" UUID,

    CONSTRAINT "operational_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_tasks" (
    "id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000),
    "status" "task_status" NOT NULL DEFAULT 'OPEN',
    "priority" "task_priority" NOT NULL DEFAULT 'MEDIUM',
    "assignedToAdminId" UUID,
    "createdByAdminId" UUID,
    "relatedCareRecipientId" UUID,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "operational_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_ratings" (
    "id" UUID NOT NULL,
    "careRecipientId" UUID,
    "caregiverId" UUID,
    "visitId" UUID,
    "submittedByUserId" UUID,
    "submittedByAdminId" UUID,
    "reviewerType" "rating_reviewer_type" NOT NULL DEFAULT 'FAMILY',
    "reviewerName" VARCHAR(200),
    "reviewerRelationship" VARCHAR(80),
    "score" INTEGER NOT NULL,
    "comment" VARCHAR(1000),
    "traits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" UUID NOT NULL,
    "caregiverId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "kind" "credential_kind" NOT NULL DEFAULT 'CERTIFICATION',
    "licenseNumber" VARCHAR(120),
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "documentKey" VARCHAR(500),
    "fileName" VARCHAR(255),
    "uploadedBy" VARCHAR(120),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregiver_documents" (
    "id" UUID NOT NULL,
    "caregiverId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "category" "caregiver_document_category" NOT NULL,
    "status" "caregiver_document_status" NOT NULL DEFAULT 'ACTIVE',
    "documentDate" DATE,
    "documentKey" VARCHAR(500),
    "fileName" VARCHAR(255),
    "uploadedBy" VARCHAR(120),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caregiver_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregiver_trainings" (
    "id" UUID NOT NULL,
    "caregiverId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" "caregiver_training_status" NOT NULL DEFAULT 'COMPLETED',
    "completedAt" DATE,
    "certificate" BOOLEAN NOT NULL DEFAULT false,
    "hoursCompleted" INTEGER NOT NULL DEFAULT 0,
    "hoursRequired" INTEGER,
    "documentKey" VARCHAR(500),
    "fileName" VARCHAR(255),
    "uploadedBy" VARCHAR(120),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caregiver_trainings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_email_key" ON "clients"("email");

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "clients"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "two_factor_recovery_codes_userId_idx" ON "two_factor_recovery_codes"("userId");

-- CreateIndex
CREATE INDEX "two_factor_recovery_codes_codeHash_idx" ON "two_factor_recovery_codes"("codeHash");

-- CreateIndex
CREATE INDEX "verification_codes_userId_purpose_idx" ON "verification_codes"("userId", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "device_sessions_currentTokenHash_key" ON "device_sessions"("currentTokenHash");

-- CreateIndex
CREATE INDEX "device_sessions_userId_idx" ON "device_sessions"("userId");

-- CreateIndex
CREATE INDEX "login_events_userId_createdAt_idx" ON "login_events"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "care_recipients_recipientNumber_key" ON "care_recipients"("recipientNumber");

-- CreateIndex
CREATE INDEX "care_recipients_ownerId_idx" ON "care_recipients"("ownerId");

-- CreateIndex
CREATE INDEX "care_recipients_ownerId_status_idx" ON "care_recipients"("ownerId", "status");

-- CreateIndex
CREATE INDEX "care_recipients_status_priority_idx" ON "care_recipients"("status", "priority");

-- CreateIndex
CREATE INDEX "medications_careRecipientId_idx" ON "medications"("careRecipientId");

-- CreateIndex
CREATE INDEX "care_goals_careRecipientId_idx" ON "care_goals"("careRecipientId");

-- CreateIndex
CREATE INDEX "care_plan_schedule_blocks_careRecipientId_idx" ON "care_plan_schedule_blocks"("careRecipientId");

-- CreateIndex
CREATE INDEX "care_instructions_careRecipientId_idx" ON "care_instructions"("careRecipientId");

-- CreateIndex
CREATE INDEX "care_plan_revisions_careRecipientId_createdAt_idx" ON "care_plan_revisions"("careRecipientId", "createdAt");

-- CreateIndex
CREATE INDEX "medication_warnings_careRecipientId_idx" ON "medication_warnings"("careRecipientId");

-- CreateIndex
CREATE INDEX "medication_audits_careRecipientId_createdAt_idx" ON "medication_audits"("careRecipientId", "createdAt");

-- CreateIndex
CREATE INDEX "health_events_careRecipientId_occurredAt_idx" ON "health_events"("careRecipientId", "occurredAt");

-- CreateIndex
CREATE INDEX "care_team_assignments_careRecipientId_idx" ON "care_team_assignments"("careRecipientId");

-- CreateIndex
CREATE INDEX "care_team_assignment_events_careRecipientId_createdAt_idx" ON "care_team_assignment_events"("careRecipientId", "createdAt");

-- CreateIndex
CREATE INDEX "coverage_blocks_careRecipientId_idx" ON "coverage_blocks"("careRecipientId");

-- CreateIndex
CREATE INDEX "recipient_documents_careRecipientId_uploadedAt_idx" ON "recipient_documents"("careRecipientId", "uploadedAt");

-- CreateIndex
CREATE INDEX "recipient_documents_careRecipientId_category_idx" ON "recipient_documents"("careRecipientId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "recipient_invoices_sequence_key" ON "recipient_invoices"("sequence");

-- CreateIndex
CREATE INDEX "recipient_invoices_careRecipientId_issuedAt_idx" ON "recipient_invoices"("careRecipientId", "issuedAt");

-- CreateIndex
CREATE INDEX "recipient_invoice_lines_invoiceId_idx" ON "recipient_invoice_lines"("invoiceId");

-- CreateIndex
CREATE INDEX "recipient_invoice_payments_careRecipientId_receivedAt_idx" ON "recipient_invoice_payments"("careRecipientId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "billing_profiles_careRecipientId_key" ON "billing_profiles"("careRecipientId");

-- CreateIndex
CREATE INDEX "care_notes_careRecipientId_postedAt_idx" ON "care_notes"("careRecipientId", "postedAt");

-- CreateIndex
CREATE INDEX "care_notes_careRecipientId_category_idx" ON "care_notes"("careRecipientId", "category");

-- CreateIndex
CREATE INDEX "note_comments_noteId_createdAt_idx" ON "note_comments"("noteId", "createdAt");

-- CreateIndex
CREATE INDEX "family_contacts_careRecipientId_idx" ON "family_contacts"("careRecipientId");

-- CreateIndex
CREATE INDEX "family_communications_careRecipientId_occurredAt_idx" ON "family_communications"("careRecipientId", "occurredAt");

-- CreateIndex
CREATE INDEX "family_communications_familyContactId_occurredAt_idx" ON "family_communications"("familyContactId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "discharge_records_careRecipientId_key" ON "discharge_records"("careRecipientId");

-- CreateIndex
CREATE UNIQUE INDEX "care_plans_type_key" ON "care_plans"("type");

-- CreateIndex
CREATE UNIQUE INDEX "care_plan_prices_planId_currency_key" ON "care_plan_prices"("planId", "currency");

-- CreateIndex
CREATE INDEX "bookings_ownerId_idx" ON "bookings"("ownerId");

-- CreateIndex
CREATE INDEX "bookings_careRecipientId_idx" ON "bookings"("careRecipientId");

-- CreateIndex
CREATE INDEX "visits_caregiverId_scheduledDate_idx" ON "visits"("caregiverId", "scheduledDate");

-- CreateIndex
CREATE INDEX "visits_careRecipientId_idx" ON "visits"("careRecipientId");

-- CreateIndex
CREATE INDEX "visit_notes_visitId_createdAt_idx" ON "visit_notes"("visitId", "createdAt");

-- CreateIndex
CREATE INDEX "visit_breaks_visitId_idx" ON "visit_breaks"("visitId");

-- CreateIndex
CREATE INDEX "medication_administrations_visitId_idx" ON "medication_administrations"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "medication_administrations_visitId_medicationId_key" ON "medication_administrations"("visitId", "medicationId");

-- CreateIndex
CREATE INDEX "visit_vitals_visitId_idx" ON "visit_vitals"("visitId");

-- CreateIndex
CREATE INDEX "sos_alerts_caregiverId_createdAt_idx" ON "sos_alerts"("caregiverId", "createdAt");

-- CreateIndex
CREATE INDEX "sos_alerts_visitId_idx" ON "sos_alerts"("visitId");

-- CreateIndex
CREATE INDEX "sos_alerts_status_createdAt_idx" ON "sos_alerts"("status", "createdAt");

-- CreateIndex
CREATE INDEX "visit_tasks_visitId_idx" ON "visit_tasks"("visitId");

-- CreateIndex
CREATE INDEX "subscriptions_ownerId_idx" ON "subscriptions"("ownerId");

-- CreateIndex
CREATE INDEX "subscriptions_careRecipientId_idx" ON "subscriptions"("careRecipientId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "care_circle_members_memberUserId_idx" ON "care_circle_members"("memberUserId");

-- CreateIndex
CREATE UNIQUE INDEX "care_circle_members_ownerId_memberUserId_key" ON "care_circle_members"("ownerId", "memberUserId");

-- CreateIndex
CREATE UNIQUE INDEX "care_codes_code_key" ON "care_codes"("code");

-- CreateIndex
CREATE INDEX "care_codes_ownerId_status_idx" ON "care_codes"("ownerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_feeds_token_key" ON "calendar_feeds"("token");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE INDEX "invoices_ownerId_periodStart_idx" ON "invoices"("ownerId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_subscriptionId_periodStart_key" ON "invoices"("subscriptionId", "periodStart");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoiceId_idx" ON "invoice_line_items"("invoiceId");

-- CreateIndex
CREATE INDEX "scheduling_holidays_date_idx" ON "scheduling_holidays"("date");

-- CreateIndex
CREATE INDEX "location_pings_caregiverId_recordedAt_idx" ON "location_pings"("caregiverId", "recordedAt");

-- CreateIndex
CREATE INDEX "location_pings_visitId_idx" ON "location_pings"("visitId");

-- CreateIndex
CREATE INDEX "location_pings_sosAlertId_idx" ON "location_pings"("sosAlertId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_providerReference_key" ON "payments"("providerReference");

-- CreateIndex
CREATE INDEX "payments_ownerId_idx" ON "payments"("ownerId");

-- CreateIndex
CREATE INDEX "payments_payableType_payableId_idx" ON "payments"("payableType", "payableId");

-- CreateIndex
CREATE INDEX "payment_methods_ownerId_idx" ON "payment_methods"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_provider_providerMethodRef_key" ON "payment_methods"("provider", "providerMethodRef");

-- CreateIndex
CREATE UNIQUE INDEX "caregiver_pay_rates_caregiverId_key" ON "caregiver_pay_rates"("caregiverId");

-- CreateIndex
CREATE INDEX "payslips_caregiverId_periodStart_idx" ON "payslips"("caregiverId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_caregiverId_periodStart_key" ON "payslips"("caregiverId", "periodStart");

-- CreateIndex
CREATE INDEX "caregiver_availability_caregiverId_date_idx" ON "caregiver_availability"("caregiverId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "caregiver_availability_caregiverId_date_key" ON "caregiver_availability"("caregiverId", "date");

-- CreateIndex
CREATE INDEX "caregiver_availability_slots_availabilityId_idx" ON "caregiver_availability_slots"("availabilityId");

-- CreateIndex
CREATE INDEX "additional_care_requests_careRecipientId_createdAt_idx" ON "additional_care_requests"("careRecipientId", "createdAt");

-- CreateIndex
CREATE INDEX "additional_care_requests_ownerId_idx" ON "additional_care_requests"("ownerId");

-- CreateIndex
CREATE INDEX "additional_care_requests_status_createdAt_idx" ON "additional_care_requests"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "client_applications_sequence_key" ON "client_applications"("sequence");

-- CreateIndex
CREATE INDEX "client_applications_stage_idx" ON "client_applications"("stage");

-- CreateIndex
CREATE INDEX "client_applications_status_idx" ON "client_applications"("status");

-- CreateIndex
CREATE INDEX "client_applications_currency_createdAt_idx" ON "client_applications"("currency", "createdAt");

-- CreateIndex
CREATE INDEX "client_applications_coordinatorId_idx" ON "client_applications"("coordinatorId");

-- CreateIndex
CREATE INDEX "client_applications_priority_idx" ON "client_applications"("priority");

-- CreateIndex
CREATE INDEX "client_application_documents_applicationId_idx" ON "client_application_documents"("applicationId");

-- CreateIndex
CREATE INDEX "client_lifecycle_events_applicationId_idx" ON "client_lifecycle_events"("applicationId");

-- CreateIndex
CREATE INDEX "client_lifecycle_events_stage_enteredAt_idx" ON "client_lifecycle_events"("stage", "enteredAt");

-- CreateIndex
CREATE UNIQUE INDEX "managed_care_plans_coreType_key" ON "managed_care_plans"("coreType");

-- CreateIndex
CREATE INDEX "managed_care_plans_status_idx" ON "managed_care_plans"("status");

-- CreateIndex
CREATE UNIQUE INDEX "managed_care_plan_prices_planId_currency_key" ON "managed_care_plan_prices"("planId", "currency");

-- CreateIndex
CREATE INDEX "managed_care_plan_versions_planId_versionNumber_idx" ON "managed_care_plan_versions"("planId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_ops_subscriptionId_key" ON "subscription_ops"("subscriptionId");

-- CreateIndex
CREATE INDEX "subscription_ops_events_opsId_occurredAt_idx" ON "subscription_ops_events"("opsId", "occurredAt");

-- CreateIndex
CREATE INDEX "subscription_ops_notes_opsId_createdAt_idx" ON "subscription_ops_notes"("opsId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "family_directory_entries_sequence_key" ON "family_directory_entries"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "family_directory_entries_userId_key" ON "family_directory_entries"("userId");

-- CreateIndex
CREATE INDEX "family_directory_entries_status_idx" ON "family_directory_entries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "caregiver_profiles_sequence_key" ON "caregiver_profiles"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "caregiver_profiles_userId_key" ON "caregiver_profiles"("userId");

-- CreateIndex
CREATE INDEX "caregiver_profiles_status_idx" ON "caregiver_profiles"("status");

-- CreateIndex
CREATE INDEX "caregiver_profile_notes_profileId_createdAt_idx" ON "caregiver_profile_notes"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "caregiver_profile_notes_profileId_kind_idx" ON "caregiver_profile_notes"("profileId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_verifications_ownerId_key" ON "kyc_verifications"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_users_status_idx" ON "admin_users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_currentTokenHash_key" ON "admin_sessions"("currentTokenHash");

-- CreateIndex
CREATE INDEX "admin_sessions_adminUserId_idx" ON "admin_sessions"("adminUserId");

-- CreateIndex
CREATE INDEX "operational_alerts_status_createdAt_idx" ON "operational_alerts"("status", "createdAt");

-- CreateIndex
CREATE INDEX "operational_alerts_relatedVisitId_idx" ON "operational_alerts"("relatedVisitId");

-- CreateIndex
CREATE INDEX "operational_tasks_status_createdAt_idx" ON "operational_tasks"("status", "createdAt");

-- CreateIndex
CREATE INDEX "operational_tasks_assignedToAdminId_idx" ON "operational_tasks"("assignedToAdminId");

-- CreateIndex
CREATE INDEX "care_ratings_careRecipientId_idx" ON "care_ratings"("careRecipientId");

-- CreateIndex
CREATE INDEX "care_ratings_caregiverId_createdAt_idx" ON "care_ratings"("caregiverId", "createdAt");

-- CreateIndex
CREATE INDEX "care_ratings_createdAt_idx" ON "care_ratings"("createdAt");

-- CreateIndex
CREATE INDEX "certifications_expiresAt_idx" ON "certifications"("expiresAt");

-- CreateIndex
CREATE INDEX "certifications_caregiverId_idx" ON "certifications"("caregiverId");

-- CreateIndex
CREATE INDEX "caregiver_documents_caregiverId_idx" ON "caregiver_documents"("caregiverId");

-- CreateIndex
CREATE INDEX "caregiver_trainings_caregiverId_idx" ON "caregiver_trainings"("caregiverId");

-- AddForeignKey
ALTER TABLE "two_factor_recovery_codes" ADD CONSTRAINT "two_factor_recovery_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_events" ADD CONSTRAINT "login_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_careRecipientId_fkey" FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_goals" ADD CONSTRAINT "care_goals_careRecipientId_fkey" FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plan_schedule_blocks" ADD CONSTRAINT "care_plan_schedule_blocks_careRecipientId_fkey" FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_instructions" ADD CONSTRAINT "care_instructions_careRecipientId_fkey" FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plan_revisions" ADD CONSTRAINT "care_plan_revisions_careRecipientId_fkey" FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_warnings" ADD CONSTRAINT "medication_warnings_careRecipientId_fkey" FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_audits" ADD CONSTRAINT "medication_audits_careRecipientId_fkey" FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_events" ADD CONSTRAINT "health_events_careRecipientId_fkey" FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_team_assignments" ADD CONSTRAINT "care_team_assignments_careRecipientId_fkey" FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_team_assignment_events" ADD CONSTRAINT "care_team_assignment_events_careRecipientId_fkey" FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_blocks" ADD CONSTRAINT "coverage_blocks_careRecipientId_fkey" FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipient_documents" ADD CONSTRAINT "recipient_documents_careRecipientId_fkey" FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipient_invoices" ADD CONSTRAINT "recipient_invoices_careRecipientId_fkey" FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipient_invoice_lines" ADD CONSTRAINT "recipient_invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "recipient_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipient_invoice_payments" ADD CONSTRAINT "recipient_invoice_payments_careRecipientId_fkey" FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_profiles" ADD CONSTRAINT "billing_profiles_careRecipientId_fkey" FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_notes" ADD CONSTRAINT "care_notes_careRecipientId_fkey" FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_comments" ADD CONSTRAINT "note_comments_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "care_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_contacts" ADD CONSTRAINT "family_contacts_careRecipientId_fkey" FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_communications" ADD CONSTRAINT "family_communications_careRecipientId_fkey" FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_communications" ADD CONSTRAINT "family_communications_familyContactId_fkey" FOREIGN KEY ("familyContactId") REFERENCES "family_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discharge_records" ADD CONSTRAINT "discharge_records_careRecipientId_fkey" FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plan_prices" ADD CONSTRAINT "care_plan_prices_planId_fkey" FOREIGN KEY ("planId") REFERENCES "care_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_notes" ADD CONSTRAINT "visit_notes_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_breaks" ADD CONSTRAINT "visit_breaks_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_vitals" ADD CONSTRAINT "visit_vitals_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_tasks" ADD CONSTRAINT "visit_tasks_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caregiver_availability_slots" ADD CONSTRAINT "caregiver_availability_slots_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES "caregiver_availability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_application_documents" ADD CONSTRAINT "client_application_documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "client_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_lifecycle_events" ADD CONSTRAINT "client_lifecycle_events_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "client_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "managed_care_plan_prices" ADD CONSTRAINT "managed_care_plan_prices_planId_fkey" FOREIGN KEY ("planId") REFERENCES "managed_care_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "managed_care_plan_versions" ADD CONSTRAINT "managed_care_plan_versions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "managed_care_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_ops_events" ADD CONSTRAINT "subscription_ops_events_opsId_fkey" FOREIGN KEY ("opsId") REFERENCES "subscription_ops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_ops_notes" ADD CONSTRAINT "subscription_ops_notes_opsId_fkey" FOREIGN KEY ("opsId") REFERENCES "subscription_ops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caregiver_profile_notes" ADD CONSTRAINT "caregiver_profile_notes_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "caregiver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

