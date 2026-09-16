import { Inject, Injectable } from '@nestjs/common';
import { CareRequestStatus as PrismaCareRequestStatus } from '@prisma/client';
import { CARE_REQUESTS_READ_MODEL, CareRequestsReadModel } from '../ports/care-requests-read.port';
import { CareRequestListResult } from '../dto/care-request-list.result';

interface ListCareRequestsCommand {
  status: PrismaCareRequestStatus | null;
  page: number;
  pageSize: number;
}

/**
 * List additional care requests for the admin queue, newest first, with the family
 * and patient names resolved. Defaults to the pending queue at the controller. Read
 * only.
 */
@Injectable()
export class ListCareRequestsUseCase {
  constructor(@Inject(CARE_REQUESTS_READ_MODEL) private readonly reads: CareRequestsReadModel) {}

  async execute(command: ListCareRequestsCommand): Promise<CareRequestListResult> {
    const page = await this.reads.listCareRequests(command.status, command.page, command.pageSize);
    return {
      total: page.total,
      page: command.page,
      pageSize: command.pageSize,
      rows: page.rows.map((row) => ({
        id: row.id,
        familyName: row.familyName,
        patientName: row.patientName,
        careType: row.careType,
        requestedDate: row.requestedDate.toISOString(),
        startMinute: row.startMinute,
        durationMinutes: row.durationMinutes,
        reason: row.reason,
        status: String(row.status),
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }
}
