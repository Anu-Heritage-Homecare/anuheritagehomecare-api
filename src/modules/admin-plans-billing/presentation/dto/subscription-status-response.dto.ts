import { ApiProperty } from '@nestjs/swagger';
import {
  StatusBucketResult,
  SubscriptionStatusResult,
} from '../../application/dto/subscription-status.result';

class StatusBucketDto implements StatusBucketResult {
  @ApiProperty() key!: string;
  @ApiProperty() label!: string;
  @ApiProperty() count!: number;
  @ApiProperty() sharePercent!: number;
}

/** The Subscription Status donut response for one market. */
export class SubscriptionStatusResponseDto implements SubscriptionStatusResult {
  @ApiProperty() currency!: string;
  @ApiProperty() totalAccounts!: number;
  @ApiProperty() capped!: boolean;
  @ApiProperty({ type: [StatusBucketDto] }) buckets!: StatusBucketDto[];

  static fromResult(result: SubscriptionStatusResult): SubscriptionStatusResponseDto {
    return result;
  }
}
