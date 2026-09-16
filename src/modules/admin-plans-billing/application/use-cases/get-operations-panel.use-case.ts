import { Inject, Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency } from '@prisma/client';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import {
  FLEXIBLE_HOURS_READ_MODEL,
  FlexibleHoursReadModel,
} from '../ports/flexible-hours-read.port';
import { CommandActionResult, OperationsPanelResult } from '../dto/operations-panel.result';

/**
 * The Immediate Command Actions bar. Only actions with a real backing surface are
 * available; the rest are reported as deferred with a reason, so the panel shows an
 * honest bar rather than buttons that do nothing.
 */
const COMMAND_ACTIONS: CommandActionResult[] = [
  { key: 'APPROVE_CARE_REQUEST', label: 'Approve Care Request', available: true, reason: null },
  {
    key: 'CREATE_CARE_PLAN',
    label: 'Create Care Plan',
    available: false,
    reason: 'The plan catalogue is managed centrally; an admin edit surface is not built yet.',
  },
  {
    key: 'CREATE_SUBSCRIPTION',
    label: 'Create Subscription',
    available: false,
    reason: 'Subscriptions are created from the family checkout and payment flow.',
  },
  {
    key: 'GENERATE_INVOICE',
    label: 'Generate Invoice',
    available: false,
    reason: 'Invoice generation is not built yet.',
  },
  {
    key: 'ISSUE_REFUND',
    label: 'Issue Refund',
    available: false,
    reason: 'Refunds are not supported by the payment gateway yet.',
  },
  {
    key: 'EXPORT_REVENUE_REPORT',
    label: 'Export Revenue Report',
    available: false,
    reason: 'Revenue report export is not built yet.',
  },
];

interface GetOperationsPanelCommand {
  currency: Currency;
}

/**
 * The Flexible Hours Asset Tracker plus the Immediate Command Actions bar. The hours
 * figures are currency scoped and derived from confirmed bookings; the command
 * actions describe which operations are wired. Read only.
 */
@Injectable()
export class GetOperationsPanelUseCase {
  constructor(
    @Inject(FLEXIBLE_HOURS_READ_MODEL) private readonly reads: FlexibleHoursReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetOperationsPanelCommand): Promise<OperationsPanelResult> {
    const prismaCurrency =
      command.currency === Currency.NigerianNaira ? PrismaCurrency.NGN : PrismaCurrency.USD;
    const hours = await this.reads.flexibleHours(prismaCurrency, this.clock.now());

    return {
      flexibleHours: {
        currency: String(command.currency),
        bookingsThisMonth: hours.bookingsThisMonth,
        hoursBookedThisMonth: hours.hoursBookedThisMonth,
        revenueThisMonthMinor: hours.revenueThisMonthMinor,
        upcomingBookings: hours.upcomingBookings,
        upcomingHours: hours.upcomingHours,
        remainingBalanceHours: null,
      },
      commandActions: COMMAND_ACTIONS.map((action) => ({ ...action })),
    };
  }
}
