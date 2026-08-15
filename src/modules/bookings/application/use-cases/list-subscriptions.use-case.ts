import { Inject, Injectable } from '@nestjs/common';
import {
  SUBSCRIPTION_REPOSITORY,
  SubscriptionRepository,
} from '../../domain/subscription.repository';
import { SubscriptionResult, toSubscriptionResult } from '../dto/subscription.result';

/** Use case: list every subscription owned by the authenticated owner. */
@Injectable()
export class ListSubscriptionsUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
  ) {}

  async execute(params: { ownerId: string }): Promise<SubscriptionResult[]> {
    const subscriptions = await this.subscriptions.listByOwner(params.ownerId);
    return subscriptions.map(toSubscriptionResult);
  }
}
