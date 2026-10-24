import { Injectable } from '@nestjs/common';
import { AccountRegistrar } from '@modules/identity/application/services/account-registrar.service';
import {
  MemberAccountRegistrar,
  MemberRegistrationDetails,
  MemberRegistrationOutcome,
} from '../../application/ports/member-account-registrar.port';

/**
 * Adapts the identity account registrar to the profile member registrar port.
 * Fixes `isFamilyOwner` to false: a care circle invitee owns no family of their
 * own. Uniqueness and the ACCOUNT_EXISTS signal come straight from the shared
 * registrar, so member signup and owner signup behave identically on a clash.
 */
@Injectable()
export class IdentityMemberAccountRegistrar implements MemberAccountRegistrar {
  constructor(private readonly registrar: AccountRegistrar) {}

  async register(details: MemberRegistrationDetails): Promise<MemberRegistrationOutcome> {
    const result = await this.registrar.register({ ...details, isFamilyOwner: false });
    return {
      userId: result.userId,
      emailVerificationRequired: result.emailVerificationRequired,
    };
  }
}
