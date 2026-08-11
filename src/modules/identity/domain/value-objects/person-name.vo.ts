import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';

interface PersonNameProps {
  firstName: string;
  lastName: string;
}

const MAX_NAME_LENGTH = 100;

/**
 * A user's full name, split into first and last. Identity owns its own copy of
 * this value object; bounded contexts do not share domain types.
 */
export class PersonName extends ValueObject<PersonNameProps> {
  private constructor(props: PersonNameProps) {
    super(props);
  }

  public static create(firstNameRaw: string, lastNameRaw: string): PersonName {
    const firstName = firstNameRaw.trim();
    const lastName = lastNameRaw.trim();

    PersonName.assertValidPart(firstName, 'First name');
    PersonName.assertValidPart(lastName, 'Last name');

    return new PersonName({ firstName, lastName });
  }

  private static assertValidPart(value: string, label: string): void {
    if (value.length === 0) {
      throw new ValidationException(`${label} is required`);
    }
    if (value.length > MAX_NAME_LENGTH) {
      throw new ValidationException(`${label} exceeds the maximum length`);
    }
  }

  public get firstName(): string {
    return this.props.firstName;
  }

  public get lastName(): string {
    return this.props.lastName;
  }

  public get fullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`;
  }
}
