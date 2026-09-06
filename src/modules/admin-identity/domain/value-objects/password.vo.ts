import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';

interface PasswordProps {
  value: string;
}

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

/**
 * A raw, plaintext admin password captured only long enough to be validated
 * against the password policy and handed to the hasher. It is never persisted or
 * logged; the aggregate only ever stores the resulting hash.
 */
export class Password extends ValueObject<PasswordProps> {
  private constructor(props: PasswordProps) {
    super(props);
  }

  public static create(raw: string): Password {
    if (typeof raw !== 'string' || raw.length === 0) {
      throw new ValidationException('Password is required');
    }
    if (raw.length < MIN_LENGTH) {
      throw new ValidationException(`Password must be at least ${MIN_LENGTH} characters`);
    }
    if (raw.length > MAX_LENGTH) {
      throw new ValidationException(`Password must be at most ${MAX_LENGTH} characters`);
    }
    if (!/[a-z]/.test(raw)) {
      throw new ValidationException('Password must contain a lowercase letter');
    }
    if (!/[A-Z]/.test(raw)) {
      throw new ValidationException('Password must contain an uppercase letter');
    }
    if (!/\d/.test(raw)) {
      throw new ValidationException('Password must contain a digit');
    }

    return new Password({ value: raw });
  }

  public get value(): string {
    return this.props.value;
  }
}
