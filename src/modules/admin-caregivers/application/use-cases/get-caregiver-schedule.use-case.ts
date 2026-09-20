import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CAREGIVER_READ_MODEL, CaregiverReadModel } from '../ports/caregiver-read.port';

export interface CaregiverScheduleVisitResult {
  scheduledDate: string;
  startMinute: number;
  endMinute: number;
  time: string;
  recipientName: string;
  visitType: string;
  status: string;
}

export interface CaregiverScheduleResult {
  from: string;
  to: string;
  visits: CaregiverScheduleVisitResult[];
}

interface GetCaregiverScheduleCommand {
  profileId: string;
  from: Date;
  to: Date;
}

/** The caregiver Schedule tab: the caregiver's visits over a date range. Read only. */
@Injectable()
export class GetCaregiverScheduleUseCase {
  constructor(@Inject(CAREGIVER_READ_MODEL) private readonly reads: CaregiverReadModel) {}

  async execute(command: GetCaregiverScheduleCommand): Promise<CaregiverScheduleResult> {
    const visits = await this.reads.schedule(command.profileId, command.from, command.to);
    if (visits === null) {
      throw new NotFoundDomainException('Caregiver not found');
    }
    return {
      from: command.from.toISOString(),
      to: command.to.toISOString(),
      visits: visits.map((visit) => ({
        scheduledDate: visit.scheduledDate.toISOString(),
        startMinute: visit.startMinute,
        endMinute: visit.endMinute,
        time: formatMinute(visit.startMinute),
        recipientName: visit.recipientName,
        visitType: visit.visitType,
        status: visit.status,
      })),
    };
  }
}

/** Format minutes from midnight as a 12 hour time, e.g. 480 -> 8:00 AM. */
function formatMinute(minute: number): string {
  const hour24 = Math.floor(minute / 60);
  const minutes = minute % 60;
  const period = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}
