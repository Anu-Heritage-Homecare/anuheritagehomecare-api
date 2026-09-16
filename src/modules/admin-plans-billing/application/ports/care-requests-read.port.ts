import { CareRequestStatus as PrismaCareRequestStatus } from '@prisma/client';

/** One row of the New Care Requests table (family and patient resolved). */
export interface CareRequestRowView {
  id: string;
  familyName: string | null;
  patientName: string | null;
  careType: string;
  requestedDate: Date;
  startMinute: number;
  durationMinutes: number;
  reason: string | null;
  status: PrismaCareRequestStatus;
  createdAt: Date;
}

/** A page of care request rows plus the total matching the filter. */
export interface CareRequestPageView {
  total: number;
  rows: CareRequestRowView[];
}

/**
 * Read model over the additional care requests table for the admin queue. Care
 * requests carry no currency, so this read is a global operational queue rather
 * than being scoped to a market.
 */
export interface CareRequestsReadModel {
  listCareRequests(
    status: PrismaCareRequestStatus | null,
    page: number,
    pageSize: number,
  ): Promise<CareRequestPageView>;
}

export const CARE_REQUESTS_READ_MODEL = Symbol('CARE_REQUESTS_READ_MODEL');
