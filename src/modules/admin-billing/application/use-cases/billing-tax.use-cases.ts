import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { BillingTax } from '../../domain/billing-tax.entity';
import { BILLING_TAX_REPOSITORY, BillingTaxRepository } from '../../domain/billing-tax.repository';
import { TaxScope } from '../../domain/tax-scope.enum';
import { BillingAndPaymentsScreenResult } from '../dto/billing-and-payments-screen.result';
import { GetBillingAndPaymentsUseCase } from './get-billing-and-payments.use-case';

export interface CreateTaxCommand {
  name: string;
  ratePercent: number;
  scope: TaxScope;
  isActive?: boolean;
  description?: string | null;
  sortOrder?: number;
}

function percentToBasisPoints(percent: number): number {
  return Math.round(percent * 100);
}

/** Use case: add a tax (the Add Tax action). */
@Injectable()
export class CreateTaxUseCase {
  constructor(
    @Inject(BILLING_TAX_REPOSITORY) private readonly taxes: BillingTaxRepository,
    private readonly screen: GetBillingAndPaymentsUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreateTaxCommand): Promise<BillingAndPaymentsScreenResult> {
    const tax = BillingTax.create({
      id: this.ids.generate(),
      name: command.name,
      rateBasisPoints: percentToBasisPoints(command.ratePercent),
      scope: command.scope,
      isActive: command.isActive,
      description: command.description,
      sortOrder: command.sortOrder,
      now: this.clock.now(),
    });
    await this.taxes.save(tax);
    return this.screen.execute();
  }
}

export interface UpdateTaxCommand {
  taxId: string;
  name?: string;
  ratePercent?: number;
  scope?: TaxScope;
  isActive?: boolean;
  description?: string | null;
  sortOrder?: number;
}

/** Use case: edit a tax, including its active toggle. */
@Injectable()
export class UpdateTaxUseCase {
  constructor(
    @Inject(BILLING_TAX_REPOSITORY) private readonly taxes: BillingTaxRepository,
    private readonly screen: GetBillingAndPaymentsUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateTaxCommand): Promise<BillingAndPaymentsScreenResult> {
    const tax = await this.taxes.findById(command.taxId);
    if (tax === null) {
      throw new NotFoundDomainException('Tax not found');
    }
    tax.edit(
      {
        name: command.name,
        rateBasisPoints:
          command.ratePercent === undefined ? undefined : percentToBasisPoints(command.ratePercent),
        scope: command.scope,
        isActive: command.isActive,
        description: command.description,
        sortOrder: command.sortOrder,
      },
      this.clock.now(),
    );
    await this.taxes.save(tax);
    return this.screen.execute();
  }
}

/** Use case: remove a tax. */
@Injectable()
export class DeleteTaxUseCase {
  constructor(
    @Inject(BILLING_TAX_REPOSITORY) private readonly taxes: BillingTaxRepository,
    private readonly screen: GetBillingAndPaymentsUseCase,
  ) {}

  async execute(taxId: string): Promise<BillingAndPaymentsScreenResult> {
    const tax = await this.taxes.findById(taxId);
    if (tax === null) {
      throw new NotFoundDomainException('Tax not found');
    }
    await this.taxes.delete(taxId);
    return this.screen.execute();
  }
}
