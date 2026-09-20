import { Inject, Injectable } from '@nestjs/common';
import {
  CAREGIVER_PROFILE_REPOSITORY,
  CaregiverProfileRepository,
} from '@modules/caregiver-profile/domain/caregiver-profile.repository';
import { CaregiverPayRate } from '@modules/earnings/domain/caregiver-pay-rate.entity';
import {
  CAREGIVER_PAY_RATE_REPOSITORY,
  CaregiverPayRateRepository,
} from '@modules/earnings/domain/caregiver-pay-rate.repository';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { currencyForCountryCode } from '@shared/domain/currency.enum';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

/** Default pay rules applied when a caregiver's rate is captured for the first time. */
const DEFAULT_OVERTIME_MULTIPLIER_BPS = 15_000;
const DEFAULT_REGULAR_HOURS_CAP = 80;
const DEFAULT_WEEKEND_BONUS_MINOR = 0;
const DEFAULT_TAX_RATE_BPS = 0;

export interface SetCaregiverHourlyRateCommand {
  profileId: string;
  hourlyRateMinor: number;
}

/**
 * Capture a caregiver's hourly rate into the earnings pay rate. The billing
 * currency is derived server side from the caregiver's country, never sent by the
 * client. A first capture creates the rate with default overtime, cap, weekend
 * and tax rules (set on the dedicated payroll surface); a later capture updates
 * the rate in place.
 */
@Injectable()
export class SetCaregiverHourlyRateUseCase {
  constructor(
    @Inject(CAREGIVER_PROFILE_REPOSITORY) private readonly profiles: CaregiverProfileRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CAREGIVER_PAY_RATE_REPOSITORY) private readonly payRates: CaregiverPayRateRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: SetCaregiverHourlyRateCommand): Promise<void> {
    const profile = await this.profiles.findById(command.profileId);
    if (profile === null || profile.isArchived) {
      throw new NotFoundDomainException('Caregiver not found');
    }
    const user = await this.users.findById(profile.userId);
    if (user === null) {
      throw new NotFoundDomainException('Caregiver account not found');
    }
    const currency = currencyForCountryCode(String(user.address.country));

    const existing = await this.payRates.findByCaregiver(profile.userId);
    if (existing === null) {
      const created = CaregiverPayRate.create({
        id: this.ids.generate(),
        caregiverId: profile.userId,
        currency,
        hourlyRateMinor: command.hourlyRateMinor,
        overtimeMultiplierBps: DEFAULT_OVERTIME_MULTIPLIER_BPS,
        regularHoursCap: DEFAULT_REGULAR_HOURS_CAP,
        weekendBonusMinor: DEFAULT_WEEKEND_BONUS_MINOR,
        taxRateBps: DEFAULT_TAX_RATE_BPS,
      });
      await this.payRates.save(created);
      return;
    }

    existing.updateHourlyRate(command.hourlyRateMinor, currency);
    await this.payRates.save(existing);
  }
}
