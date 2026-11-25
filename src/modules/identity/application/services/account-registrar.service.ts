import { randomInt } from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { FamilyDirectoryEntry } from '@modules/family-directory/domain/family-directory-entry.entity';
import {
  FAMILY_DIRECTORY_ENTRY_REPOSITORY,
  FamilyDirectoryEntryRepository,
} from '@modules/family-directory/domain/family-directory-entry.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import {
  AccountAlreadyExistsException,
  ConflictDomainException,
} from '@shared/domain/domain-exception';
import { User } from '../../domain/user.entity';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { UserType } from '../../domain/user-type.enum';
import { EmailAddress } from '../../domain/value-objects/email-address.vo';
import { Password } from '../../domain/value-objects/password.vo';
import { PersonName } from '../../domain/value-objects/person-name.vo';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo';
import { PostalAddress } from '../../domain/value-objects/postal-address.vo';
import { VerificationPurpose } from '../../domain/verification-purpose.enum';
import { RegisterAccountCommand } from '../commands/register-account.command';
import { RegistrationResult } from '../dto/registration.result';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';
import { OtpService } from './otp.service';

/**
 * Creates a brand new mobile account from validated input and dispatches the
 * email verification code. This is the single home of the "validate, enforce
 * uniqueness, hash, persist, send OTP" sequence, shared by the family owner self
 * signup and the invited care circle member signup so the two can never drift.
 *
 * No tokens are issued; the account is created unverified and the caller must
 * verify their email before they can log in.
 */
@Injectable()
export class AccountRegistrar {
  private readonly logger = new Logger(AccountRegistrar.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(FAMILY_DIRECTORY_ENTRY_REPOSITORY)
    private readonly familyDirectory: FamilyDirectoryEntryRepository,
    private readonly otp: OtpService,
  ) {}

  async register(command: RegisterAccountCommand): Promise<RegistrationResult> {
    const name = PersonName.create(command.firstName, command.lastName);
    const email = EmailAddress.create(command.email);
    const phone = PhoneNumber.create(command.phone);
    const address = PostalAddress.create({
      line1: command.addressLine1,
      line2: command.addressLine2,
      city: command.city,
      state: command.state,
      postalCode: command.postalCode,
      country: command.country,
    });
    const password = Password.create(command.password);

    if (await this.users.existsByEmail(email.value)) {
      throw new AccountAlreadyExistsException();
    }
    if (await this.users.existsByPhone(phone.value)) {
      throw new ConflictDomainException('An account with this phone number already exists');
    }

    const passwordHash = await this.hasher.hash(password.value);

    const user = User.register({
      id: this.ids.generate(),
      userType: UserType.FamilyMember,
      name,
      email,
      phone,
      address,
      passwordHash,
      isFamilyOwner: command.isFamilyOwner,
      now: this.clock.now(),
    });

    await this.users.save(user);
    // Domain events would be published here once persistence succeeds.
    user.clearDomainEvents();

    // A family owner is surfaced on the admin Families screen through a linked
    // ACCOUNT directory entry. Create it now so the account appears immediately.
    // The directory is a back office overlay, so a failure here must not fail the
    // user's signup; the backfill script reconciles any that slip through.
    if (command.isFamilyOwner) {
      try {
        const entry = FamilyDirectoryEntry.registerAccount({
          id: this.ids.generate(),
          userId: user.id,
          fullName: `${command.firstName} ${command.lastName}`.trim(),
          now: this.clock.now(),
        });
        await this.familyDirectory.save(entry);
      } catch (error) {
        this.logger.error(
          `Family directory entry creation failed for user ${user.id}; account created, run the backfill`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    // The account is already persisted, so a failure to dispatch the verification
    // email must not fail registration and leave an orphaned unverified account
    // that blocks retry with a 409. Keep the send non fatal; the user verifies
    // later through the resend endpoint. Log the failure (user id only, no PII) so
    // a mail outage is visible without a 500.
    try {
      await this.otp.issueAndSend(user, VerificationPurpose.EmailVerification);
    } catch (error) {
      this.logger.error(
        `Verification email dispatch failed for user ${user.id}; account created, awaiting resend`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return {
      userId: user.id,
      email: email.value,
      emailVerificationRequired: true,
    };
  }

  /**
   * Provision a caregiver account out of band. The admin supplies the person's
   * details; the service enforces the same email and phone uniqueness as self
   * signup, generates a strong temporary password, hashes it and creates an
   * already verified, active account flagged to force a password change on first
   * login. No verification email is sent. The plaintext temporary password is
   * returned to the caller exactly once so the admin can relay it to the
   * caregiver; it is never persisted (only its hash is) nor logged.
   */
  async provisionCaregiver(command: ProvisionCaregiverCommand): Promise<ProvisionAccountResult> {
    const name = PersonName.create(command.firstName, command.lastName);
    const email = EmailAddress.create(command.email);
    const phone = PhoneNumber.create(command.phone);
    const address = PostalAddress.create({
      line1: command.addressLine1,
      line2: command.addressLine2 ?? null,
      city: command.city,
      state: command.state,
      postalCode: command.postalCode,
      country: command.country,
    });

    if (await this.users.existsByEmail(email.value)) {
      throw new AccountAlreadyExistsException();
    }
    if (await this.users.existsByPhone(phone.value)) {
      throw new ConflictDomainException('An account with this phone number already exists');
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await this.hasher.hash(Password.create(temporaryPassword).value);

    const user = User.provisionByAdmin({
      id: this.ids.generate(),
      userType: UserType.Caregiver,
      name,
      email,
      phone,
      address,
      passwordHash,
      now: this.clock.now(),
    });

    await this.users.save(user);

    return { userId: user.id, temporaryPassword };
  }
}

export interface ProvisionCaregiverCommand {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ProvisionAccountResult {
  userId: string;
  temporaryPassword: string;
}

const TEMP_PASSWORD_LENGTH = 12;
// Ambiguous glyphs (O/0, I/l/1) are excluded so the password survives being read
// aloud or retyped from a provisioning screen.
const LOWERS = 'abcdefghijkmnpqrstuvwxyz';
const UPPERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';

/**
 * A cryptographically random temporary password that always satisfies the
 * password policy (at least one lowercase, uppercase and digit). The guaranteed
 * characters are shuffled so their positions are not predictable.
 */
function generateTemporaryPassword(): string {
  const all = LOWERS + UPPERS + DIGITS;
  const pick = (set: string): string => set[randomInt(set.length)];
  const chars = [pick(LOWERS), pick(UPPERS), pick(DIGITS)];
  while (chars.length < TEMP_PASSWORD_LENGTH) {
    chars.push(pick(all));
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
