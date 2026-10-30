import { ApiProperty } from '@nestjs/swagger';
import {
  BillingActivityResult,
  BillingActivityType,
  BillingDashboardKpisResult,
  BillingDashboardResult,
  BillingRevenuePointResult,
  OutstandingAgingResult,
  RecentPaymentResult,
} from '../../application/dto/billing-dashboard.result';

class BillingKpisDto implements BillingDashboardKpisResult {
  @ApiProperty() totalRevenueMinor!: number;
  @ApiProperty({ nullable: true, type: Number }) totalRevenueGrowthPercent!: number | null;
  @ApiProperty() outstandingBalanceMinor!: number;
  @ApiProperty() outstandingInvoiceCount!: number;
  @ApiProperty() overdueAmountMinor!: number;
  @ApiProperty() overdueInvoiceCount!: number;
  @ApiProperty() paymentsThisMonthMinor!: number;
  @ApiProperty() paymentsThisMonthCount!: number;
  @ApiProperty({ nullable: true, type: Number }) collectionRatePercent!: number | null;
  @ApiProperty({ nullable: true, type: Number }) collectionRateDeltaPercent!: number | null;
}

class RevenuePointDto implements BillingRevenuePointResult {
  @ApiProperty() label!: string;
  @ApiProperty() monthStart!: string;
  @ApiProperty() totalMinor!: number;
}

class OutstandingAgingDto implements OutstandingAgingResult {
  @ApiProperty() days0to30Minor!: number;
  @ApiProperty() days31to60Minor!: number;
  @ApiProperty() days61to90Minor!: number;
  @ApiProperty() days90PlusMinor!: number;
}

class RecentPaymentDto implements RecentPaymentResult {
  @ApiProperty() reference!: string;
  @ApiProperty() account!: string;
  @ApiProperty() amountMinor!: number;
  @ApiProperty({ nullable: true, type: String }) methodLabel!: string | null;
  @ApiProperty() receivedAt!: string;
}

class BillingActivityDto implements BillingActivityResult {
  @ApiProperty({ enum: ['PAYMENT_RECEIVED', 'INVOICE_CREATED', 'INVOICE_OVERDUE'] })
  type!: BillingActivityType;
  @ApiProperty() title!: string;
  @ApiProperty() at!: string;
  @ApiProperty() account!: string;
  @ApiProperty({ nullable: true, type: String }) invoiceNumber!: string | null;
  @ApiProperty({ nullable: true, type: Number }) amountMinor!: number | null;
  @ApiProperty({ nullable: true, type: Number }) daysPastDue!: number | null;
}

/** The full Billing dashboard response for one currency. */
export class BillingDashboardResponseDto implements BillingDashboardResult {
  @ApiProperty() currency!: string;
  @ApiProperty() generatedAt!: string;
  @ApiProperty({ type: BillingKpisDto }) kpis!: BillingKpisDto;
  @ApiProperty({ type: [RevenuePointDto] }) revenueSeries!: RevenuePointDto[];
  @ApiProperty({ type: OutstandingAgingDto }) outstandingAging!: OutstandingAgingDto;
  @ApiProperty({ type: [RecentPaymentDto] }) recentPayments!: RecentPaymentDto[];
  @ApiProperty({ type: [BillingActivityDto] }) recentActivity!: BillingActivityDto[];

  static fromResult(result: BillingDashboardResult): BillingDashboardResponseDto {
    return result;
  }
}
