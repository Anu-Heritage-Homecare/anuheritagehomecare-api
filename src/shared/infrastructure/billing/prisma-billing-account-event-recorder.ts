import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  BillingAccountEventRecorder,
  RecordBillingAccountEvent,
} from '@shared/application/ports/billing-account-event-recorder.port';

/** Persists billing account events to the append only billing_account_events table. */
@Injectable()
export class PrismaBillingAccountEventRecorder implements BillingAccountEventRecorder {
  constructor(private readonly prisma: PrismaService) {}

  async record(event: RecordBillingAccountEvent): Promise<void> {
    await this.prisma.billingAccountEvent.create({
      data: {
        familyDirectoryEntryId: event.familyDirectoryEntryId,
        kind: event.kind,
        detail: event.detail ?? null,
        actorAdminId: event.actorAdminId ?? null,
      },
    });
  }
}
