import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { BillingProfile } from '../../domain/billing-profile.entity';
import { BillingProfileRepository } from '../../domain/billing-profile.repository';
import { TO_DOMAIN_CURRENCY, TO_PERSISTENCE_CURRENCY } from './billing-enum.maps';

/** Prisma backed adapter for the BillingProfileRepository port (one per recipient). */
@Injectable()
export class BillingProfilePrismaRepository implements BillingProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByRecipient(careRecipientId: string): Promise<BillingProfile | null> {
    const row = await this.prisma.billingProfile.findUnique({ where: { careRecipientId } });
    if (row === null) {
      return null;
    }
    return BillingProfile.rehydrate(row.id, {
      careRecipientId: row.careRecipientId,
      billingContactName: row.billingContactName,
      billingContactRelationship: row.billingContactRelationship,
      billingContactEmail: row.billingContactEmail,
      billingContactPhone: row.billingContactPhone,
      paymentMethodBrand: row.paymentMethodBrand,
      paymentMethodLast4: row.paymentMethodLast4,
      autoPayEnabled: row.autoPayEnabled,
      primaryInsuranceProvider: row.primaryInsuranceProvider,
      primaryInsurancePolicyNumber: row.primaryInsurancePolicyNumber,
      primaryInsuranceCoveragePercent: row.primaryInsuranceCoveragePercent,
      primaryInsuranceCoverageDetails: row.primaryInsuranceCoverageDetails,
      coPayPerVisitMinor: row.coPayPerVisitMinor,
      coPayCurrency: row.coPayCurrency === null ? null : TO_DOMAIN_CURRENCY[row.coPayCurrency],
      secondaryInsurance: row.secondaryInsurance,
      updatedAt: row.updatedAt,
    });
  }

  async save(profile: BillingProfile): Promise<void> {
    const data = {
      careRecipientId: profile.careRecipientId,
      billingContactName: profile.billingContactName,
      billingContactRelationship: profile.billingContactRelationship,
      billingContactEmail: profile.billingContactEmail,
      billingContactPhone: profile.billingContactPhone,
      paymentMethodBrand: profile.paymentMethodBrand,
      paymentMethodLast4: profile.paymentMethodLast4,
      autoPayEnabled: profile.autoPayEnabled,
      primaryInsuranceProvider: profile.primaryInsuranceProvider,
      primaryInsurancePolicyNumber: profile.primaryInsurancePolicyNumber,
      primaryInsuranceCoveragePercent: profile.primaryInsuranceCoveragePercent,
      primaryInsuranceCoverageDetails: profile.primaryInsuranceCoverageDetails,
      coPayPerVisitMinor: profile.coPayPerVisitMinor,
      coPayCurrency:
        profile.coPayCurrency === null ? null : TO_PERSISTENCE_CURRENCY[profile.coPayCurrency],
      secondaryInsurance: profile.secondaryInsurance,
    };
    await this.prisma.billingProfile.upsert({
      where: { careRecipientId: profile.careRecipientId },
      create: { id: profile.id, ...data },
      update: data,
    });
  }
}
