/** One row of the Families directory table. */
export interface FamilyRowResult {
  id: string;
  reference: string;
  name: string;
  relationship: string | null;
  hasAccount: boolean;
  phone: string | null;
  email: string | null;
  linkedRecipientNames: string[];
  billingStatus: string;
  status: string;
  unreadMessages: number | null;
  lastActivity: string;
}

export interface FamilyListResult {
  total: number;
  page: number;
  pageSize: number;
  rows: FamilyRowResult[];
}

/** The Families KPI bar. */
export interface FamilyKpisResult {
  totalFamilies: number;
  newFamilies: number;
  primaryContacts: number;
  withActiveCare: number;
  outstandingPayments: number;
  pendingRequests: number;
  unreadMessages: number | null;
}

/** The Quick Preview drawer detail. */
export interface FamilyDetailResult {
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
  billingStatus: string;
  status: string;
  quickNotes: string | null;
  lastActivity: string;
  unreadMessages: number | null;
}
