import { Inject, Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency } from '@prisma/client';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import {
  SUBSCRIPTIONS_ADMIN_READ_MODEL,
  SubscriptionsAdminReadModel,
} from '../ports/subscriptions-admin-read.port';
import { SubscriptionKpisResult } from '../dto/enriched-subscription-list.result';

interface GetSubscriptionKpisCommand {
  currency: Currency;
}

/**
 * The Subscriptions KPI bar: total active, paused, pending activation, cancelled,
 * renewing soon and expiring, for one market. Renewing soon and expiring are derived
 * from the active subscriptions' renewal cadence and auto renew flag. Read only.
 */
@Injectable()
export class GetSubscriptionKpisUseCase {
  constructor(
    @Inject(SUBSCRIPTIONS_ADMIN_READ_MODEL)
    private readonly reads: SubscriptionsAdminReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetSubscriptionKpisCommand): Promise<SubscriptionKpisResult> {
    const prismaCurrency =
      command.currency === Currency.NigerianNaira ? PrismaCurrency.NGN : PrismaCurrency.USD;
    const view = await this.reads.subscriptionKpis(prismaCurrency, this.clock.now());

    return {
      currency: String(command.currency),
      totalActive: view.totalActive,
      paused: view.paused,
      pendingActivation: view.pendingActivation,
      cancelled: view.cancelled,
      renewingSoon: view.renewingSoon,
      expiring: view.expiring,
      capped: view.activeTotal > view.activeScanned,
    };
  }
}
