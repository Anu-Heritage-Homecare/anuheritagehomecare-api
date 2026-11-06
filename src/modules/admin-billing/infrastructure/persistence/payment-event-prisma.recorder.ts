import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { PaymentEventRecorder, RecordPaymentEvent } from '../../domain/payment-event.recorder';

/** Persists payment lifecycle events to the append only payment_events table. */
@Injectable()
export class PaymentEventPrismaRecorder implements PaymentEventRecorder {
  constructor(private readonly prisma: PrismaService) {}

  async record(events: RecordPaymentEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }
    await this.prisma.paymentEvent.createMany({
      data: events.map((event) => ({
        paymentId: event.paymentId,
        type: event.type,
        at: event.at,
        actorType: event.actorType,
        actorAdminId: event.actorAdminId ?? null,
        actorLabel: event.actorLabel ?? null,
        detail: event.detail ?? null,
      })),
    });
  }
}
