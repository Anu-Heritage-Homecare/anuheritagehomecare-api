import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ClientStatus } from './client-status.enum';
import { ClientRegisteredEvent } from './events/client-registered.event';
import { EmailAddress } from './value-objects/email-address.vo';
import { PersonName } from './value-objects/person-name.vo';
import { PhoneNumber } from './value-objects/phone-number.vo';

interface ClientProps {
  name: PersonName;
  email: EmailAddress;
  phone: PhoneNumber;
  status: ClientStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Client aggregate root (a care recipient).
 *
 * All construction goes through factory methods so invariants are enforced in
 * one place. State transitions are expressed as intention revealing methods
 * (`deactivate`, `archive`) rather than open setters, keeping the aggregate
 * always valid.
 */
export class Client extends AggregateRoot<string> {
  private props: ClientProps;

  private constructor(id: string, props: ClientProps) {
    super(id);
    this.props = props;
  }

  /** Register a brand new client and record the corresponding domain event. */
  public static register(params: {
    id: string;
    name: PersonName;
    email: EmailAddress;
    phone: PhoneNumber;
    now: Date;
  }): Client {
    const client = new Client(params.id, {
      name: params.name,
      email: params.email,
      phone: params.phone,
      status: ClientStatus.Active,
      createdAt: params.now,
      updatedAt: params.now,
    });
    client.addDomainEvent(new ClientRegisteredEvent(params.id, params.email.value));
    return client;
  }

  /** Rehydrate an existing client from persistence without emitting events. */
  public static rehydrate(id: string, props: ClientProps): Client {
    return new Client(id, props);
  }

  public deactivate(now: Date): void {
    if (this.props.status === ClientStatus.Archived) {
      return;
    }
    this.props.status = ClientStatus.Inactive;
    this.props.updatedAt = now;
  }

  public archive(now: Date): void {
    this.props.status = ClientStatus.Archived;
    this.props.updatedAt = now;
  }

  public get name(): PersonName {
    return this.props.name;
  }

  public get email(): EmailAddress {
    return this.props.email;
  }

  public get phone(): PhoneNumber {
    return this.props.phone;
  }

  public get status(): ClientStatus {
    return this.props.status;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
