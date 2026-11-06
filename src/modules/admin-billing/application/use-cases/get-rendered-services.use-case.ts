import { Inject, Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency } from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { BillingSettings } from '../../domain/billing-settings.entity';
import {
  BILLING_SETTINGS_REPOSITORY,
  BillingSettingsRepository,
} from '../../domain/billing-settings.repository';
import { deriveRenderedQuantities } from '../../domain/rendered-services.calculator';
import { RenderedServicesResult } from '../dto/rendered-services.result';
import { basisPointsToPercent } from '../dto/billing-settings.result';
import {
  BILLABLE_SERVICES_READ_MODEL,
  BillableServicesCatalogReadModel,
} from '../ports/billable-services-read.port';
import {
  INVOICE_WIZARD_READ_MODEL,
  InvoiceWizardReadModel,
} from '../ports/invoice-wizard-read.port';

export interface GetRenderedServicesCommand {
  recipientId: string;
  currency: Currency;
  from: Date;
  to: Date;
}

/**
 * Select Billable Services (wizard step 3): the market catalog with each service's
 * quantity pre filled from the recipient's completed visits over the billing period.
 */
@Injectable()
export class GetRenderedServicesUseCase {
  constructor(
    @Inject(BILLABLE_SERVICES_READ_MODEL)
    private readonly catalog: BillableServicesCatalogReadModel,
    @Inject(INVOICE_WIZARD_READ_MODEL) private readonly wizard: InvoiceWizardReadModel,
    @Inject(BILLING_SETTINGS_REPOSITORY) private readonly settings: BillingSettingsRepository,
  ) {}

  async execute(command: GetRenderedServicesCommand): Promise<RenderedServicesResult> {
    if (command.to.getTime() < command.from.getTime()) {
      throw new ValidationException('The billing period end cannot precede its start');
    }

    const prismaCurrency =
      command.currency === Currency.NigerianNaira ? PrismaCurrency.NGN : PrismaCurrency.USD;
    const [services, settings, care] = await Promise.all([
      this.catalog.list(prismaCurrency),
      this.settings.load(),
      this.wizard.renderedCare(command.recipientId, command.from, command.to),
    ]);
    if (care === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const taxBasisPoints = (settings ?? BillingSettings.createDefault()).snapshot()
      .standardTaxRateBasisPoints;
    const quantities = deriveRenderedQuantities(care.visits, services);

    return {
      currency: command.currency,
      periodStart: command.from.toISOString(),
      periodEnd: command.to.toISOString(),
      taxRatePercent: basisPointsToPercent(taxBasisPoints),
      services: services.map((service) => {
        const derived = quantities.get(service.code) ?? { quantity: 0, sourceVisitCount: 0 };
        return {
          id: service.id,
          code: service.code,
          name: service.name,
          description: service.description,
          unit: service.unit,
          rateMinor: service.rateMinor,
          suggestedQuantity: derived.quantity,
          sourceVisitCount: derived.sourceVisitCount,
          amountMinor:
            service.rateMinor === null ? 0 : Math.round(service.rateMinor * derived.quantity),
        };
      }),
    };
  }
}
