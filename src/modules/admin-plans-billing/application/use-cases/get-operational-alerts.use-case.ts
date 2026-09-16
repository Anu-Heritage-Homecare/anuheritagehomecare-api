import { Inject, Injectable } from '@nestjs/common';
import {
  Currency as PrismaCurrency,
  SubscriptionStatus as PrismaSubscriptionStatus,
} from '@prisma/client';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import {
  OPERATIONAL_ALERTS_READ_MODEL,
  OperationalAlertsReadModel,
} from '../ports/operational-alerts-read.port';
import { PLANS_BILLING_READ_MODEL, PlansBillingReadModel } from '../ports/plans-billing-read.port';
import { OperationalAlertResult, OperationalAlertsResult } from '../dto/operational-alerts.result';
import { nextMonthlyRenewal } from '../renewal-schedule';

const FAILED_WINDOW_DAYS = 30;
const EXPIRING_SOON_DAYS = 14;
const SCAN_LIMIT = 500;
const DAY_MS = 86_400_000;

const CRITICAL = 'CRITICAL';
const WARNING = 'WARNING';

interface GetOperationalAlertsCommand {
  currency: Currency;
}

/**
 * The Operational Alerts Queue for one market, derived from current state. The
 * Flexible Hours Low alert needs a contract hour balance that is not modelled, so it
 * is reported as not tracked rather than with an invented figure. Read only.
 */
@Injectable()
export class GetOperationalAlertsUseCase {
  constructor(
    @Inject(OPERATIONAL_ALERTS_READ_MODEL)
    private readonly alerts: OperationalAlertsReadModel,
    @Inject(PLANS_BILLING_READ_MODEL) private readonly reads: PlansBillingReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetOperationalAlertsCommand): Promise<OperationalAlertsResult> {
    const now = this.clock.now();
    const failedSince = new Date(now.getTime() - FAILED_WINDOW_DAYS * DAY_MS);
    const soonCutoff = new Date(now.getTime() + EXPIRING_SOON_DAYS * DAY_MS);
    const prismaCurrency =
      command.currency === Currency.NigerianNaira ? PrismaCurrency.NGN : PrismaCurrency.USD;

    const [counts, activePage] = await Promise.all([
      this.alerts.alertCounts(prismaCurrency, failedSince),
      this.reads.listSubscriptions(prismaCurrency, PrismaSubscriptionStatus.ACTIVE, 1, SCAN_LIMIT),
    ]);

    const expiringSoon = activePage.rows.filter(
      (row) => nextMonthlyRenewal(row.startDate, now).getTime() <= soonCutoff.getTime(),
    ).length;

    const alerts: OperationalAlertResult[] = [
      alert(
        'PAYMENT_FAILED',
        CRITICAL,
        'Payment Failed',
        'clients with a failed transaction attempt',
        counts.paymentFailedClients,
      ),
      alert(
        'DOCUMENTATION_MISSING',
        WARNING,
        'Documentation Missing',
        'applications pending identity or medical upload',
        counts.documentationMissing,
      ),
      alert(
        'COORDINATOR_NOT_ASSIGNED',
        WARNING,
        'Coordinator Not Assigned',
        'approved applications waiting for lead assignment',
        counts.coordinatorNotAssigned,
      ),
      alert(
        'PLAN_EXPIRING_SOON',
        WARNING,
        'Plan Expiring Soon',
        'subscriptions renewing within two weeks',
        expiringSoon,
      ),
      {
        key: 'FLEXIBLE_HOURS_LOW',
        severity: WARNING,
        title: 'Flexible Hours Low',
        detail: 'requires a contract hour balance, which is not tracked yet',
        count: null,
        available: false,
      },
      alert(
        'SUBSCRIPTION_SUSPENDED',
        CRITICAL,
        'Subscription Suspended',
        'accounts marked past due through default',
        counts.subscriptionSuspended,
      ),
    ];

    return {
      currency: String(command.currency),
      generatedAt: now.toISOString(),
      alerts,
    };
  }
}

function alert(
  key: string,
  severity: string,
  title: string,
  detail: string,
  count: number,
): OperationalAlertResult {
  return { key, severity, title, detail, count, available: true };
}
