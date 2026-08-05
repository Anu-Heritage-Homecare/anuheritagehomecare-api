import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { ConflictDomainException } from '@shared/domain/domain-exception';
import { Client } from '../../domain/client.entity';
import { CLIENT_REPOSITORY, ClientRepository } from '../../domain/client.repository';
import { EmailAddress } from '../../domain/value-objects/email-address.vo';
import { PersonName } from '../../domain/value-objects/person-name.vo';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo';
import { RegisterClientCommand } from '../commands/register-client.command';
import { ClientResult, toClientResult } from '../dto/client-result';

/**
 * Use case: register a new client.
 *
 * Orchestrates domain objects and the repository port. Business rules live in
 * the domain; this class only coordinates them and enforces the cross aggregate
 * rule that an email must be unique.
 */
@Injectable()
export class RegisterClientUseCase {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: RegisterClientCommand): Promise<ClientResult> {
    const name = PersonName.create(command.firstName, command.lastName);
    const email = EmailAddress.create(command.email);
    const phone = PhoneNumber.create(command.phone);

    if (await this.clients.existsByEmail(email.value)) {
      throw new ConflictDomainException('A client with this email already exists');
    }

    const client = Client.register({
      id: this.ids.generate(),
      name,
      email,
      phone,
      now: this.clock.now(),
    });

    await this.clients.save(client);

    // Domain events would be published here once persistence succeeds.
    client.clearDomainEvents();

    return toClientResult(client);
  }
}
