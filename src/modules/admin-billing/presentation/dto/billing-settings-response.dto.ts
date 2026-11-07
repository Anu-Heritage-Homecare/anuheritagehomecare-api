import { ApiProperty } from '@nestjs/swagger';
import {
  BillingAutomationSettingsResult,
  BillingCompanyProfileResult,
  BillingInvoiceSettingsResult,
  BillingNotificationSettingsResult,
  BillingPaymentMethodResult,
  BillingSettingsResult,
} from '../../application/dto/billing-settings.result';
import { ALL_BILLING_PAYMENT_METHOD_KINDS } from '../../domain/billing-payment-method-kind.enum';

class BillingInvoiceSettingsDto implements BillingInvoiceSettingsResult {
  @ApiProperty({ example: 30 }) defaultPaymentTermsDays!: number;
  @ApiProperty({ example: 'INV-' }) invoicePrefix!: string;
  @ApiProperty({ example: 'NGN' }) defaultCurrency!: string;
  @ApiProperty({ example: 7.5 }) standardTaxRatePercent!: number;
  @ApiProperty() autoNumbering!: boolean;
}

class BillingAutomationSettingsDto implements BillingAutomationSettingsResult {
  @ApiProperty() autoSendInvoices!: boolean;
  @ApiProperty() paymentReminders!: boolean;
  @ApiProperty({ example: 7 }) reminderDaysBefore!: number;
  @ApiProperty() overdueNotifications!: boolean;
  @ApiProperty({ example: 1 }) overdueNoticeDaysAfter!: number;
  @ApiProperty() autoReceipts!: boolean;
}

class BillingNotificationSettingsDto implements BillingNotificationSettingsResult {
  @ApiProperty() email!: boolean;
  @ApiProperty() sms!: boolean;
  @ApiProperty() inApp!: boolean;
}

class BillingPaymentMethodDto implements BillingPaymentMethodResult {
  @ApiProperty({ enum: ALL_BILLING_PAYMENT_METHOD_KINDS }) method!: string;
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ example: 'Manual confirmation of transfers' }) description!: string;
}

class BillingCompanyProfileDto implements BillingCompanyProfileResult {
  @ApiProperty({ nullable: true, type: String, example: 'CareProfs Medical Ltd' })
  companyName!: string | null;
  @ApiProperty({ nullable: true, type: String, example: '12 Medical Road, Ikeja, Lagos, Nigeria' })
  companyAddress!: string | null;
  @ApiProperty({ nullable: true, type: String, example: 'First Bank' }) bankName!: string | null;
  @ApiProperty({ nullable: true, type: String, example: '1029302910' })
  bankAccountNumber!: string | null;
  @ApiProperty({ nullable: true, type: String, example: 'CareProfs Medical Ltd' })
  bankAccountName!: string | null;
}

/** The whole Billing Settings screen. */
export class BillingSettingsResponseDto implements BillingSettingsResult {
  @ApiProperty({ type: BillingInvoiceSettingsDto }) invoice!: BillingInvoiceSettingsDto;
  @ApiProperty({ type: BillingAutomationSettingsDto }) automation!: BillingAutomationSettingsDto;
  @ApiProperty({ type: BillingNotificationSettingsDto })
  notifications!: BillingNotificationSettingsDto;
  @ApiProperty({ type: BillingCompanyProfileDto }) company!: BillingCompanyProfileDto;
  @ApiProperty({ type: [BillingPaymentMethodDto] }) paymentMethods!: BillingPaymentMethodDto[];

  static fromResult(result: BillingSettingsResult): BillingSettingsResponseDto {
    return result;
  }
}

/** One payment avenue, returned by the per method Edit action. */
export class BillingPaymentMethodResponseDto implements BillingPaymentMethodResult {
  @ApiProperty({ enum: ALL_BILLING_PAYMENT_METHOD_KINDS }) method!: string;
  @ApiProperty() enabled!: boolean;
  @ApiProperty() description!: string;

  static fromResult(result: BillingPaymentMethodResult): BillingPaymentMethodResponseDto {
    return result;
  }
}
