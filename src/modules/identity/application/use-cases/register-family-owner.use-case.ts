import { Injectable } from '@nestjs/common';
import { RegisterFamilyOwnerCommand } from '../commands/register-family-owner.command';
import { RegistrationResult } from '../dto/registration.result';
import { AccountRegistrar } from '../services/account-registrar.service';

/**
 * Use case: register a family owner on the mobile app.
 *
 * A family owner is a mobile account flagged as the owner of their family. The
 * account creation sequence (validate input, enforce unique email and phone,
 * store only a password hash, create the account unverified and dispatch an email
 * verification code) is shared with the invited care circle member signup and
 * lives in {@link AccountRegistrar}; this use case fixes `isFamilyOwner` to true.
 * No tokens are issued here; the user must verify their email before logging in.
 */
@Injectable()
export class RegisterFamilyOwnerUseCase {
  constructor(private readonly registrar: AccountRegistrar) {}

  execute(command: RegisterFamilyOwnerCommand): Promise<RegistrationResult> {
    return this.registrar.register({ ...command, isFamilyOwner: true });
  }
}
