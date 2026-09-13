import { ApiProperty } from '@nestjs/swagger';
import {
  MoneyResult,
  RecipientBillingResult,
} from '../../application/dto/recipient-billing.result';

class MoneyDto {
  @ApiProperty() amountMinor!: number;
  @ApiProperty() currency!: string;
}

function moneyDto(value: MoneyResult | null): MoneyDto | null {
  return value === null ? null : { amountMinor: value.amountMinor, currency: value.currency };
}

class SummaryDto {
  @ApiProperty({ type: MoneyDto, nullable: true }) totalBilledThisMonth!: MoneyDto | null;
  @ApiProperty({ nullable: true }) billedTrendPercent!: number | null;
  @ApiProperty({ type: MoneyDto, nullable: true }) outstanding!: MoneyDto | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  outstandingDueDate!: string | null;
  @ApiProperty({ type: MoneyDto, nullable: true }) lastPayment!: MoneyDto | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) lastPaymentAt!: string | null;
  @ApiProperty() paymentStatus!: string;
}

class ContactDto {
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty({ nullable: true }) relationship!: string | null;
  @ApiProperty({ nullable: true }) email!: string | null;
  @ApiProperty({ nullable: true }) phone!: string | null;
}

class PaymentMethodDto {
  @ApiProperty({ nullable: true }) brand!: string | null;
  @ApiProperty({ nullable: true }) last4!: string | null;
  @ApiProperty() autoPayEnabled!: boolean;
}

class InsuranceDto {
  @ApiProperty({ nullable: true }) provider!: string | null;
  @ApiProperty({ nullable: true }) policyNumber!: string | null;
  @ApiProperty({ nullable: true }) coveragePercent!: number | null;
  @ApiProperty({ nullable: true }) coverageDetails!: string | null;
  @ApiProperty({ type: MoneyDto, nullable: true }) coPayPerVisit!: MoneyDto | null;
  @ApiProperty({ nullable: true }) secondary!: string | null;
}

class ProfileDto {
  @ApiProperty({ type: ContactDto }) contact!: ContactDto;
  @ApiProperty({ type: PaymentMethodDto }) paymentMethod!: PaymentMethodDto;
  @ApiProperty({ type: InsuranceDto }) insurance!: InsuranceDto;
}

class InvoiceItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'INV-2026-089' }) number!: string;
  @ApiProperty({ type: String, format: 'date' }) periodStart!: string;
  @ApiProperty({ type: String, format: 'date' }) periodEnd!: string;
  @ApiProperty() servicesLabel!: string;
  @ApiProperty({ type: MoneyDto }) amount!: MoneyDto;
  @ApiProperty({ type: MoneyDto }) insuranceCovered!: MoneyDto;
  @ApiProperty({ type: MoneyDto }) patientDue!: MoneyDto;
  @ApiProperty() displayStatus!: string;
}

class InvoicesPageDto {
  @ApiProperty({ type: [InvoiceItemDto] }) items!: InvoiceItemDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

class ServiceBreakdownItemDto {
  @ApiProperty() serviceName!: string;
  @ApiProperty({ type: MoneyDto }) amount!: MoneyDto;
  @ApiProperty() percent!: number;
}

class ServiceBreakdownDto {
  @ApiProperty({ type: MoneyDto, nullable: true }) total!: MoneyDto | null;
  @ApiProperty({ type: [ServiceBreakdownItemDto] }) items!: ServiceBreakdownItemDto[];
}

class PaymentHistoryItemDto {
  @ApiProperty({ type: MoneyDto }) amount!: MoneyDto;
  @ApiProperty({ nullable: true }) methodLabel!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) receivedAt!: string;
}

export class RecipientBillingResponseDto {
  @ApiProperty({ type: SummaryDto }) summary!: SummaryDto;
  @ApiProperty({ type: ProfileDto }) profile!: ProfileDto;
  @ApiProperty({ type: InvoicesPageDto }) invoices!: InvoicesPageDto;
  @ApiProperty({ type: ServiceBreakdownDto }) serviceBreakdown!: ServiceBreakdownDto;
  @ApiProperty({ type: [PaymentHistoryItemDto] }) paymentHistory!: PaymentHistoryItemDto[];

  static fromResult(result: RecipientBillingResult): RecipientBillingResponseDto {
    const dto = new RecipientBillingResponseDto();
    dto.summary = {
      totalBilledThisMonth: moneyDto(result.summary.totalBilledThisMonth),
      billedTrendPercent: result.summary.billedTrendPercent,
      outstanding: moneyDto(result.summary.outstanding),
      outstandingDueDate:
        result.summary.outstandingDueDate === null
          ? null
          : result.summary.outstandingDueDate.toISOString(),
      lastPayment: moneyDto(result.summary.lastPayment),
      lastPaymentAt:
        result.summary.lastPaymentAt === null ? null : result.summary.lastPaymentAt.toISOString(),
      paymentStatus: result.summary.paymentStatus,
    };
    dto.profile = {
      contact: { ...result.profile.contact },
      paymentMethod: { ...result.profile.paymentMethod },
      insurance: {
        ...result.profile.insurance,
        coPayPerVisit: moneyDto(result.profile.insurance.coPayPerVisit),
      },
    };
    dto.invoices = {
      items: result.invoices.items.map((i) => ({
        id: i.id,
        number: i.number,
        periodStart: i.period.start.toISOString().slice(0, 10),
        periodEnd: i.period.end.toISOString().slice(0, 10),
        servicesLabel: i.servicesLabel,
        amount: { ...i.amount },
        insuranceCovered: { ...i.insuranceCovered },
        patientDue: { ...i.patientDue },
        displayStatus: i.displayStatus,
      })),
      page: result.invoices.page,
      pageSize: result.invoices.pageSize,
      total: result.invoices.total,
      totalPages: result.invoices.totalPages,
    };
    dto.serviceBreakdown = {
      total: moneyDto(result.serviceBreakdown.total),
      items: result.serviceBreakdown.items.map((i) => ({
        serviceName: i.serviceName,
        amount: { ...i.amount },
        percent: i.percent,
      })),
    };
    dto.paymentHistory = result.paymentHistory.map((p) => ({
      amount: { ...p.amount },
      methodLabel: p.methodLabel,
      receivedAt: p.receivedAt.toISOString(),
    }));
    return dto;
  }
}
