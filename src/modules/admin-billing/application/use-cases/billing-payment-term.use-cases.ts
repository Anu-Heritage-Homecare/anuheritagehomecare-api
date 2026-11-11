import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { BillingPaymentTerm } from '../../domain/billing-payment-term.entity';
import {
  BILLING_PAYMENT_TERM_REPOSITORY,
  BillingPaymentTermRepository,
} from '../../domain/billing-payment-term.repository';
import { BillingAndPaymentsScreenResult } from '../dto/billing-and-payments-screen.result';
import { GetBillingAndPaymentsUseCase } from './get-billing-and-payments.use-case';

/** The other terms that currently hold the default flag, cleared so one stays default. */
async function clearOtherDefaults(
  terms: BillingPaymentTermRepository,
  keepId: string,
  now: Date,
): Promise<BillingPaymentTerm[]> {
  const all = await terms.list();
  return all
    .filter((term) => term.id !== keepId && term.isDefault)
    .map((term) => {
      term.setDefault(false, now);
      return term;
    });
}

export interface CreatePaymentTermCommand {
  name: string;
  netDays?: number | null;
  isCustom?: boolean;
  isActive?: boolean;
  isDefault?: boolean;
  description?: string | null;
  sortOrder?: number;
}

/** Use case: add a payment term (the Add Term action). */
@Injectable()
export class CreatePaymentTermUseCase {
  constructor(
    @Inject(BILLING_PAYMENT_TERM_REPOSITORY) private readonly terms: BillingPaymentTermRepository,
    private readonly screen: GetBillingAndPaymentsUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreatePaymentTermCommand): Promise<BillingAndPaymentsScreenResult> {
    const now = this.clock.now();
    const term = BillingPaymentTerm.create({
      id: this.ids.generate(),
      name: command.name,
      netDays: command.netDays,
      isCustom: command.isCustom,
      isActive: command.isActive,
      isDefault: command.isDefault,
      description: command.description,
      sortOrder: command.sortOrder,
      now,
    });
    if (command.isDefault === true) {
      const cleared = await clearOtherDefaults(this.terms, term.id, now);
      await this.terms.saveMany([...cleared, term]);
    } else {
      await this.terms.save(term);
    }
    return this.screen.execute();
  }
}

export interface UpdatePaymentTermCommand {
  termId: string;
  name?: string;
  netDays?: number | null;
  isCustom?: boolean;
  isActive?: boolean;
  isDefault?: boolean;
  description?: string | null;
  sortOrder?: number;
}

/** Use case: edit a payment term, including making it the default. */
@Injectable()
export class UpdatePaymentTermUseCase {
  constructor(
    @Inject(BILLING_PAYMENT_TERM_REPOSITORY) private readonly terms: BillingPaymentTermRepository,
    private readonly screen: GetBillingAndPaymentsUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdatePaymentTermCommand): Promise<BillingAndPaymentsScreenResult> {
    const now = this.clock.now();
    const term = await this.terms.findById(command.termId);
    if (term === null) {
      throw new NotFoundDomainException('Payment term not found');
    }
    term.edit(
      {
        name: command.name,
        netDays: command.netDays,
        isCustom: command.isCustom,
        isActive: command.isActive,
        description: command.description,
        sortOrder: command.sortOrder,
      },
      now,
    );
    if (command.isDefault === true) {
      term.setDefault(true, now);
      const cleared = await clearOtherDefaults(this.terms, term.id, now);
      await this.terms.saveMany([...cleared, term]);
    } else {
      if (command.isDefault === false) {
        term.setDefault(false, now);
      }
      await this.terms.save(term);
    }
    return this.screen.execute();
  }
}

/** Use case: remove a payment term. */
@Injectable()
export class DeletePaymentTermUseCase {
  constructor(
    @Inject(BILLING_PAYMENT_TERM_REPOSITORY) private readonly terms: BillingPaymentTermRepository,
    private readonly screen: GetBillingAndPaymentsUseCase,
  ) {}

  async execute(termId: string): Promise<BillingAndPaymentsScreenResult> {
    const term = await this.terms.findById(termId);
    if (term === null) {
      throw new NotFoundDomainException('Payment term not found');
    }
    await this.terms.delete(termId);
    return this.screen.execute();
  }
}
