import { Injectable } from '@nestjs/common';
import { Currency } from '@shared/domain/currency.enum';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { BillingPaymentMethodKind } from '../../domain/billing-payment-method-kind.enum';
import { BillingPaymentMethodSetting } from '../../domain/billing-payment-method.entity';
import { BillingSettings } from '../../domain/billing-settings.entity';
import { BillingSettingsRepository } from '../../domain/billing-settings.repository';

/** Prisma adapter for the billing settings singleton and its payment avenues. */
@Injectable()
export class BillingSettingsPrismaRepository implements BillingSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async load(): Promise<BillingSettings | null> {
    const row = await this.prisma.billingSettings.findFirst();
    if (row === null) {
      return null;
    }
    return BillingSettings.fromPersistence({
      defaultPaymentTermsDays: row.defaultPaymentTermsDays,
      invoicePrefix: row.invoicePrefix,
      defaultCurrency: row.defaultCurrency as unknown as Currency,
      standardTaxRateBasisPoints: row.standardTaxRateBasisPoints,
      autoNumbering: row.autoNumbering,
      autoSendInvoices: row.autoSendInvoices,
      paymentReminders: row.paymentReminders,
      reminderDaysBefore: row.reminderDaysBefore,
      overdueNotifications: row.overdueNotifications,
      overdueNoticeDaysAfter: row.overdueNoticeDaysAfter,
      autoReceipts: row.autoReceipts,
      emailNotifications: row.emailNotifications,
      smsNotifications: row.smsNotifications,
      inAppNotifications: row.inAppNotifications,
      companyName: row.companyName,
      companyAddress: row.companyAddress,
      bankName: row.bankName,
      bankAccountNumber: row.bankAccountNumber,
      bankAccountName: row.bankAccountName,
    });
  }

  async save(settings: BillingSettings): Promise<void> {
    const p = settings.snapshot();
    const data = {
      defaultPaymentTermsDays: p.defaultPaymentTermsDays,
      invoicePrefix: p.invoicePrefix,
      // Domain and Prisma currency enums share the same string values.
      defaultCurrency: p.defaultCurrency,
      standardTaxRateBasisPoints: p.standardTaxRateBasisPoints,
      autoNumbering: p.autoNumbering,
      autoSendInvoices: p.autoSendInvoices,
      paymentReminders: p.paymentReminders,
      reminderDaysBefore: p.reminderDaysBefore,
      overdueNotifications: p.overdueNotifications,
      overdueNoticeDaysAfter: p.overdueNoticeDaysAfter,
      autoReceipts: p.autoReceipts,
      emailNotifications: p.emailNotifications,
      smsNotifications: p.smsNotifications,
      inAppNotifications: p.inAppNotifications,
      companyName: p.companyName,
      companyAddress: p.companyAddress,
      bankName: p.bankName,
      bankAccountNumber: p.bankAccountNumber,
      bankAccountName: p.bankAccountName,
    };
    await this.prisma.billingSettings.upsert({
      where: { singleton: true },
      create: data,
      update: data,
    });
  }

  async loadPaymentMethods(): Promise<BillingPaymentMethodSetting[]> {
    const rows = await this.prisma.billingPaymentMethodSetting.findMany();
    return rows.map((row) =>
      BillingPaymentMethodSetting.fromPersistence(
        row.method as unknown as BillingPaymentMethodKind,
        row.enabled,
        row.description,
      ),
    );
  }

  async loadPaymentMethod(
    method: BillingPaymentMethodKind,
  ): Promise<BillingPaymentMethodSetting | null> {
    const row = await this.prisma.billingPaymentMethodSetting.findUnique({ where: { method } });
    if (row === null) {
      return null;
    }
    return BillingPaymentMethodSetting.fromPersistence(method, row.enabled, row.description);
  }

  async savePaymentMethod(method: BillingPaymentMethodSetting): Promise<void> {
    await this.prisma.billingPaymentMethodSetting.upsert({
      where: { method: method.method },
      create: {
        method: method.method,
        enabled: method.enabled,
        description: method.description,
      },
      update: { enabled: method.enabled, description: method.description },
    });
  }
}
