import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { BillingProfile } from '@modules/recipient-billing/domain/billing-profile.entity';
import {
  BILLING_PROFILE_REPOSITORY,
  BillingProfileRepository,
} from '@modules/recipient-billing/domain/billing-profile.repository';
import { Currency, currencyForCountryCode } from '@shared/domain/currency.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface SetBillingProfileCommand {
  recipientId: string;
  billingContactName?: string | null;
  billingContactRelationship?: string | null;
  billingContactEmail?: string | null;
  billingContactPhone?: string | null;
  paymentMethodBrand?: string | null;
  paymentMethodLast4?: string | null;
  autoPayEnabled?: boolean;
  primaryInsuranceProvider?: string | null;
  primaryInsurancePolicyNumber?: string | null;
  primaryInsuranceCoveragePercent?: number | null;
  primaryInsuranceCoverageDetails?: string | null;
  coPayPerVisitMinor?: number | null;
  secondaryInsurance?: string | null;
}

/**
 * Use case: the admin sets a recipient's billing and insurance profile. Upserted
 * (one per recipient); the id and co-pay currency of a new profile are resolved
 * here, the currency deriving from the owner's country.
 */
@Injectable()
export class SetBillingProfileUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(BILLING_PROFILE_REPOSITORY) private readonly profiles: BillingProfileRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: SetBillingProfileCommand): Promise<{ id: string }> {
    const recipient = await this.recipients.findById(command.recipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const existing = await this.profiles.findByRecipient(command.recipientId);
    const coPayCurrency =
      command.coPayPerVisitMinor == null ? null : await this.currencyFor(recipient.ownerId);

    const profile = BillingProfile.create({
      id: existing?.id ?? this.ids.generate(),
      careRecipientId: command.recipientId,
      billingContactName: command.billingContactName,
      billingContactRelationship: command.billingContactRelationship,
      billingContactEmail: command.billingContactEmail,
      billingContactPhone: command.billingContactPhone,
      paymentMethodBrand: command.paymentMethodBrand,
      paymentMethodLast4: command.paymentMethodLast4,
      autoPayEnabled: command.autoPayEnabled,
      primaryInsuranceProvider: command.primaryInsuranceProvider,
      primaryInsurancePolicyNumber: command.primaryInsurancePolicyNumber,
      primaryInsuranceCoveragePercent: command.primaryInsuranceCoveragePercent,
      primaryInsuranceCoverageDetails: command.primaryInsuranceCoverageDetails,
      coPayPerVisitMinor: command.coPayPerVisitMinor,
      coPayCurrency,
      secondaryInsurance: command.secondaryInsurance,
      now: this.clock.now(),
    });
    await this.profiles.save(profile);
    return { id: profile.id };
  }

  private async currencyFor(ownerId: string): Promise<Currency | null> {
    const owner = await this.users.findById(ownerId);
    if (owner === null) {
      return null;
    }
    try {
      return currencyForCountryCode(String(owner.address.country));
    } catch {
      return null;
    }
  }
}
