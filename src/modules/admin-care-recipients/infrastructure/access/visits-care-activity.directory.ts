import { Inject, Injectable } from '@nestjs/common';
import { VisitStatus as PrismaVisitStatus } from '@prisma/client';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CareActivityDirectory } from '../../application/ports/care-activity.port';

/** Midnight (UTC) of the day the given instant falls on. */
function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

/**
 * Reads the visits context for the admin care recipients screen: the last visit
 * per recipient (visits up to and including today) and the count of recipients
 * with an overdue visit (a scheduled visit whose day has already passed).
 */
@Injectable()
export class VisitsCareActivityDirectory implements CareActivityDirectory {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async latestVisitByRecipients(recipientIds: string[]): Promise<Map<string, Date>> {
    if (recipientIds.length === 0) {
      return new Map();
    }
    const today = startOfUtcDay(this.clock.now());
    const groups = await this.prisma.visit.groupBy({
      by: ['careRecipientId'],
      where: { careRecipientId: { in: recipientIds }, scheduledDate: { lte: today } },
      _max: { scheduledDate: true },
    });
    const result = new Map<string, Date>();
    for (const group of groups) {
      if (group._max.scheduledDate !== null) {
        result.set(group.careRecipientId, group._max.scheduledDate);
      }
    }
    return result;
  }

  async countRecipientsWithOverdueVisit(now: Date): Promise<number> {
    const today = startOfUtcDay(now);
    const groups = await this.prisma.visit.groupBy({
      by: ['careRecipientId'],
      where: { status: PrismaVisitStatus.SCHEDULED, scheduledDate: { lt: today } },
    });
    return groups.length;
  }
}
