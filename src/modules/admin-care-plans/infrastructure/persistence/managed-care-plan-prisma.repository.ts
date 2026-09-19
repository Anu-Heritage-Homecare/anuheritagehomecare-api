import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  ManagedCarePlan,
  ServiceItem,
  VolumeDiscount,
} from '../../domain/managed-care-plan.entity';
import { ManagedCarePlanRepository } from '../../domain/managed-care-plan.repository';
import {
  TO_DOMAIN_BILLING_CYCLE,
  TO_DOMAIN_BILLING_MODEL,
  TO_DOMAIN_COUNTRY,
  TO_DOMAIN_CURRENCY,
  TO_DOMAIN_PLAN_TYPE,
  TO_DOMAIN_STATUS,
  TO_PERSISTENCE_BILLING_CYCLE,
  TO_PERSISTENCE_BILLING_MODEL,
  TO_PERSISTENCE_COUNTRY,
  TO_PERSISTENCE_CURRENCY,
  TO_PERSISTENCE_PLAN_TYPE,
  TO_PERSISTENCE_STATUS,
} from './managed-plan-enum.maps';

type PlanRow = Prisma.ManagedCarePlanGetPayload<{
  include: { prices: true; versions: true };
}>;

/** Prisma backed adapter for the ManagedCarePlanRepository port. */
@Injectable()
export class ManagedCarePlanPrismaRepository implements ManagedCarePlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(plan: ManagedCarePlan): Promise<void> {
    const data = this.toData(plan);
    const versions = plan.pullPendingVersions();
    const prices = plan.pricing;
    await this.prisma.$transaction(async (tx) => {
      await tx.managedCarePlan.upsert({
        where: { id: plan.id },
        create: data,
        update: data,
      });
      await tx.managedCarePlanPrice.deleteMany({ where: { planId: plan.id } });
      if (prices.length > 0) {
        await tx.managedCarePlanPrice.createMany({
          data: prices.map((price) => ({
            planId: plan.id,
            currency: TO_PERSISTENCE_CURRENCY[price.currency],
            monthlyPriceMinor: price.monthlyPriceMinor,
            baseRateMinor: price.baseRateMinor,
            emergencyDispatchRateMinor: price.emergencyDispatchRateMinor,
            weekendPremiumMinor: price.weekendPremiumMinor,
          })),
        });
      }
      if (versions.length > 0) {
        await tx.managedCarePlanVersion.createMany({
          data: versions.map((version) => ({
            planId: plan.id,
            versionNumber: version.versionNumber,
            summary: version.summary,
            changedByAdminId: version.changedByAdminId,
            createdAt: version.createdAt,
          })),
        });
      }
    });
  }

  async findById(id: string): Promise<ManagedCarePlan | null> {
    const row = await this.prisma.managedCarePlan.findUnique({
      where: { id },
      include: { prices: true, versions: { orderBy: { versionNumber: 'asc' } } },
    });
    return row === null ? null : this.toDomain(row);
  }

  async findByCoreType(coreType: CarePlanType): Promise<ManagedCarePlan | null> {
    const row = await this.prisma.managedCarePlan.findUnique({
      where: { coreType: TO_PERSISTENCE_PLAN_TYPE[coreType] },
      include: { prices: true, versions: { orderBy: { versionNumber: 'asc' } } },
    });
    return row === null ? null : this.toDomain(row);
  }

  async listAll(includeArchived: boolean): Promise<ManagedCarePlan[]> {
    const rows = await this.prisma.managedCarePlan.findMany({
      where: includeArchived ? {} : { status: 'ACTIVE' },
      include: { prices: true, versions: { orderBy: { versionNumber: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  private toData(plan: ManagedCarePlan): Prisma.ManagedCarePlanUncheckedCreateInput {
    const lifecycle = plan.lifecycle;
    return {
      id: plan.id,
      coreType: plan.coreType === null ? null : TO_PERSISTENCE_PLAN_TYPE[plan.coreType],
      isCore: plan.isCore,
      name: plan.name,
      description: plan.description,
      targetAudience: plan.targetAudience,
      billingModel: TO_PERSISTENCE_BILLING_MODEL[plan.billingModel],
      status: TO_PERSISTENCE_STATUS[plan.status],
      countriesEnabled: plan.countriesEnabled.map((code) => TO_PERSISTENCE_COUNTRY[code]),
      supportedCurrencies: plan.supportedCurrencies.map((code) => TO_PERSISTENCE_CURRENCY[code]),
      minimumBillingHours: plan.minimumBillingHours,
      autoRenewal: lifecycle.autoRenewal,
      billingCycle: TO_PERSISTENCE_BILLING_CYCLE[lifecycle.billingCycle],
      gracePeriodDays: lifecycle.gracePeriodDays,
      cancellationNoticeDays: lifecycle.cancellationNoticeDays,
      services: plan.includedServices as unknown as Prisma.InputJsonValue,
      volumeDiscounts: plan.discounts as unknown as Prisma.InputJsonValue,
      coverageAreas: plan.coverage,
      eligibilityRules: plan.eligibility,
      currentVersion: plan.currentVersion,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  private toDomain(row: PlanRow): ManagedCarePlan {
    return ManagedCarePlan.rehydrate(
      row.id,
      {
        coreType: row.coreType === null ? null : TO_DOMAIN_PLAN_TYPE[row.coreType],
        isCore: row.isCore,
        name: row.name,
        description: row.description,
        targetAudience: row.targetAudience,
        billingModel: TO_DOMAIN_BILLING_MODEL[row.billingModel],
        status: TO_DOMAIN_STATUS[row.status],
        countriesEnabled: row.countriesEnabled.map((code) => TO_DOMAIN_COUNTRY[code]),
        supportedCurrencies: row.supportedCurrencies.map((code) => TO_DOMAIN_CURRENCY[code]),
        minimumBillingHours: row.minimumBillingHours,
        autoRenewal: row.autoRenewal,
        billingCycle: TO_DOMAIN_BILLING_CYCLE[row.billingCycle],
        gracePeriodDays: row.gracePeriodDays,
        cancellationNoticeDays: row.cancellationNoticeDays,
        currentVersion: row.currentVersion,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      {
        prices: row.prices.map((price) => ({
          currency: TO_DOMAIN_CURRENCY[price.currency],
          monthlyPriceMinor: price.monthlyPriceMinor,
          baseRateMinor: price.baseRateMinor,
          emergencyDispatchRateMinor: price.emergencyDispatchRateMinor,
          weekendPremiumMinor: price.weekendPremiumMinor,
        })),
        services: (row.services as unknown as ServiceItem[]) ?? [],
        volumeDiscounts: (row.volumeDiscounts as unknown as VolumeDiscount[]) ?? [],
        coverageAreas: row.coverageAreas,
        eligibilityRules: row.eligibilityRules,
        versions: row.versions.map((version) => ({
          versionNumber: version.versionNumber,
          summary: version.summary,
          changedByAdminId: version.changedByAdminId,
          createdAt: version.createdAt,
        })),
      },
    );
  }
}
