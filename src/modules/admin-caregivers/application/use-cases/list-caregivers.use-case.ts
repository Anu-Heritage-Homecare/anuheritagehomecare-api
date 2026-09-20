import { Inject, Injectable } from '@nestjs/common';
import { CaregiverStatus as PrismaCaregiverStatus } from '@prisma/client';
import { CAREGIVER_READ_MODEL, CaregiverReadModel } from '../ports/caregiver-read.port';
import { CaregiverListResult } from '../dto/caregiver.result';

interface ListCaregiversCommand {
  status: PrismaCaregiverStatus | null;
  page: number;
  pageSize: number;
}

/** List the caregivers directory, optionally filtered by status. Read only. */
@Injectable()
export class ListCaregiversUseCase {
  constructor(@Inject(CAREGIVER_READ_MODEL) private readonly reads: CaregiverReadModel) {}

  async execute(command: ListCaregiversCommand): Promise<CaregiverListResult> {
    const page = await this.reads.list(command.status, command.page, command.pageSize);
    return {
      total: page.total,
      page: command.page,
      pageSize: command.pageSize,
      rows: page.rows.map((row) => ({
        id: row.id,
        reference: row.reference,
        name: row.name,
        title: row.title,
        branch: row.branch,
        employmentType: row.employmentType === null ? null : String(row.employmentType),
        status: String(row.status),
      })),
    };
  }
}
