import { FamilyMemberStatus as PrismaFamilyStatus } from '@prisma/client';

export type FamilyBillingStatus = 'CURRENT' | 'PENDING' | 'OVERDUE' | 'NONE';

/** One row of the Families directory table (composed). */
export interface FamilyRowView {
  id: string;
  reference: string;
  name: string;
  relationship: string | null;
  hasAccount: boolean;
  phone: string | null;
  email: string | null;
  linkedRecipientNames: string[];
  billingStatus: FamilyBillingStatus;
  status: PrismaFamilyStatus;
  /** Unread messages: not tracked yet (no messaging context), so always null. */
  unreadMessages: number | null;
  lastActivity: Date;
}

export interface FamilyPageView {
  total: number;
  rows: FamilyRowView[];
}

/** The Families KPI bar figures. */
export interface FamilyKpisView {
  totalFamilies: number;
  newFamilies: number;
  primaryContacts: number;
  withActiveCare: number;
  outstandingPayments: number;
  pendingRequests: number;
  /** Unread messages KPI: deferred until a messaging context exists. */
  unreadMessages: number | null;
}

/** The Quick Preview drawer detail for one family member. */
export interface FamilyDetailView {
  id: string;
  reference: string;
  name: string;
  relationship: string | null;
  hasAccount: boolean;
  phone: string | null;
  email: string | null;
  primaryRecipientName: string | null;
  linkedRecipientNames: string[];
  emergencyContactVerified: boolean;
  outstandingBalanceMinor: number;
  currency: string | null;
  billingStatus: FamilyBillingStatus;
  status: PrismaFamilyStatus;
  quickNotes: string | null;
  lastActivity: Date;
  unreadMessages: number | null;
}

/**
 * Read model over the family directory, composing each entry with its live user
 * account (or captured contact details), linked care recipients and billing status.
 */
export interface FamilyDirectoryReadModel {
  list(status: PrismaFamilyStatus | null, page: number, pageSize: number): Promise<FamilyPageView>;
  kpis(now: Date): Promise<FamilyKpisView>;
  detail(id: string): Promise<FamilyDetailView | null>;
}

export const FAMILY_DIRECTORY_READ_MODEL = Symbol('FAMILY_DIRECTORY_READ_MODEL');
