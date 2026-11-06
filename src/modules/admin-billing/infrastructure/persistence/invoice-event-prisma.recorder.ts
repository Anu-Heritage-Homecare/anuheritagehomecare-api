import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { InvoiceEventRecorder, RecordInvoiceEvent } from '../../domain/invoice-event.recorder';

/** Persists invoice lifecycle events to the append only invoice_events table. */
@Injectable()
export class InvoiceEventPrismaRecorder implements InvoiceEventRecorder {
  constructor(private readonly prisma: PrismaService) {}

  async record(event: RecordInvoiceEvent): Promise<void> {
    await this.prisma.invoiceEvent.create({
      data: {
        invoiceId: event.invoiceId,
        type: event.type,
        detail: event.detail ?? null,
        actorType: event.actorType,
        actorAdminId: event.actorAdminId ?? null,
        actorLabel: event.actorLabel ?? null,
      },
    });
  }
}
