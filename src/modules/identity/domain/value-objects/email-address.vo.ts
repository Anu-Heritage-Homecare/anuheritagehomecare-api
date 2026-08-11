import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';

interface EmailAddressProps {
  value: string;
}

// Pragmatic, conservative email pattern. Deliverability is proven by the
// verification flow, not by structural input validation.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 255;

export class EmailAddress extends ValueObject<EmailAddressProps> {
  private constructor(props: EmailAddressProps) {
    super(props);
  }

  public static create(raw: string): EmailAddress {
    const normalised = raw.trim().toLowerCase();

    if (normalised.length === 0) {
      throw new ValidationException('Email address is required');
    }
    if (normalised.length > MAX_EMAIL_LENGTH) {
      throw new ValidationException('Email address exceeds the maximum length');
    }
    if (!EMAIL_PATTERN.test(normalised)) {
      throw new ValidationException('Email address is not valid');
    }

    return new EmailAddress({ value: normalised });
  }

  public get value(): string {
    return this.props.value;
  }
}
