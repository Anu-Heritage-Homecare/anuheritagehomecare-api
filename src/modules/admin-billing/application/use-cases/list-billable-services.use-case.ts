import { Inject, Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency } from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { BillingSettings } from '../../domain/billing-settings.entity';
import {
  BILLING_SETTINGS_REPOSITORY,
  BillingSettingsRepository,
} from '../../domain/billing-settings.repository';
import { BillableServicesResult } from '../dto/billable-services.result';
import { basisPointsToPercent } from '../dto/billing-settings.result';
import {
  BILLABLE_SERVICES_READ_MODEL,
  BillableServicesCatalogReadModel,
} from '../ports/billable-services-read.port';

/** List the billable services catalog for a market, with the applicable tax rate. */
@Injectable()
export class ListBillableServicesUseCase {
  constructor(
    @Inject(BILLABLE_SERVICES_READ_MODEL)
    private readonly catalog: BillableServicesCatalogReadModel,
    @Inject(BILLING_SETTINGS_REPOSITORY)
    private readonly settings: BillingSettingsRepository,
  ) {}

  async execute(currency: Currency): Promise<BillableServicesResult> {
    const prismaCurrency =
      currency === Currency.NigerianNaira ? PrismaCurrency.NGN : PrismaCurrency.USD;
    const [services, settings] = await Promise.all([
      this.catalog.list(prismaCurrency),
      this.settings.load(),
    ]);
    const taxBasisPoints = (settings ?? BillingSettings.createDefault()).snapshot()
      .standardTaxRateBasisPoints;

    return {
      currency,
      taxRatePercent: basisPointsToPercent(taxBasisPoints),
      services: services.map((service) => ({
        id: service.id,
        code: service.code,
        name: service.name,
        description: service.description,
        unit: service.unit,
        rateMinor: service.rateMinor,
      })),
    };
  }
}
