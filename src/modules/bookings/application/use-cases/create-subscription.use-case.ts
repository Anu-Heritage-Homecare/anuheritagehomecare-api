import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  CARE_PLAN_REPOSITORY,
  CarePlanRepository,
} from '@modules/care-plans/domain/care-plan.repository';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Subscription } from '../../domain/subscription.entity';
import {
  SUBSCRIPTION_REPOSITORY,
  SubscriptionRepository,
} from '../../domain/subscription.repository';
import { CreateSubscriptionCommand } from '../commands/create-subscription.command';
import { SubscriptionResult, toSubscriptionResult } from '../dto/subscription.result';
import { CARE_RECIPIENT_ACCESS, CareRecipientAccess } from '../ports/care-recipient-access.port';

/**
 * Use case: subscribe a care recipient to a monthly plan (Standard, Premium or
 * Live in). The plan must be a monthly plan, ownership and onboarding are
 * verified, and the monthly price is snapshotted from the catalog. The
 * subscription starts awaiting its first payment.
 */
@Injectable()
export class CreateSubscriptionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(CARE_PLAN_REPOSITORY) private readonly plans: CarePlanRepository,
    @Inject(CARE_RECIPIENT_ACCESS) private readonly recipients: CareRecipientAccess,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreateSubscriptionCommand): Promise<SubscriptionResult> {
    const planType = CreateSubscriptionUseCase.toPlanType(command.planType);

    await this.recipients.assertBookable(command.ownerId, command.careRecipientId);

    const plan = await this.plans.findByType(planType);
    if (plan === null || !plan.active) {
      throw new NotFoundDomainException('Care plan not found');
    }
    if (plan.isHourly) {
      throw new ValidationException('This plan is booked by the hour, not subscribed to');
    }

    const price = plan.priceFor(command.currency);
    if (price === null) {
      throw new ValidationException('This plan is not offered in your currency');
    }

    const startDate = this.parseFutureDate(command.startDate);

    const subscription = Subscription.create({
      id: this.ids.generate(),
      ownerId: command.ownerId,
      careRecipientId: command.careRecipientId,
      planType,
      startDate,
      monthlyPrice: price.unitAmount,
      now: this.clock.now(),
    });

    await this.subscriptions.save(subscription);
    subscription.clearDomainEvents();

    return toSubscriptionResult(subscription);
  }

  private static toPlanType(raw: string): CarePlanType {
    const normalised = raw.trim().toUpperCase();
    const match = Object.values(CarePlanType).find((type) => String(type) === normalised);
    if (match === undefined) {
      throw new ValidationException(`Unknown care plan: ${raw}`);
    }
    return match;
  }

  private parseFutureDate(raw: string): Date {
    const date = new Date(`${raw}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new ValidationException('Start date must be a valid calendar date');
    }
    const now = this.clock.now();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    if (date.getTime() < todayUtc) {
      throw new ValidationException('Start date cannot be in the past');
    }
    return date;
  }
}
