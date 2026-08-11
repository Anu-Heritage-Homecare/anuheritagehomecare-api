import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { ConflictDomainException } from '@shared/domain/domain-exception';
import { User } from '../../domain/user.entity';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { UserType } from '../../domain/user-type.enum';
import { EmailAddress } from '../../domain/value-objects/email-address.vo';
import { Password } from '../../domain/value-objects/password.vo';
import { PersonName } from '../../domain/value-objects/person-name.vo';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo';
import { PostalAddress } from '../../domain/value-objects/postal-address.vo';
import { VerificationPurpose } from '../../domain/verification-purpose.enum';
import { RegisterFamilyOwnerCommand } from '../commands/register-family-owner.command';
import { RegistrationResult } from '../dto/registration.result';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';
import { OtpService } from '../services/otp.service';

/**
 * Use case: register a family owner on the mobile app.
 *
 * Validates every input through domain value objects, enforces unique email and
 * phone, stores only a password hash, creates the account in an unverified state
 * and dispatches an email verification code. No tokens are issued here; the user
 * must verify their email before they can log in.
 */
@Injectable()
export class RegisterFamilyOwnerUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    private readonly otp: OtpService,
  ) {}

  async execute(command: RegisterFamilyOwnerCommand): Promise<RegistrationResult> {
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
      throw new ConflictDomainException('An account with this email already exists');
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
      isFamilyOwner: true,
      now: this.clock.now(),
    });

    await this.users.save(user);
    // Domain events would be published here once persistence succeeds.
    user.clearDomainEvents();

    await this.otp.issueAndSend(user, VerificationPurpose.EmailVerification);

    return {
      userId: user.id,
      email: email.value,
      emailVerificationRequired: true,
    };
  }
}
