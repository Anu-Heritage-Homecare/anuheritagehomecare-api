import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';

interface PhoneNumberProps {
  value: string;
}

// E.164 style: optional leading +, then 7 to 15 digits.
const PHONE_PATTERN = /^\+?[1-9]\d{6,14}$/;

export class PhoneNumber extends ValueObject<PhoneNumberProps> {
  private constructor(props: PhoneNumberProps) {
    super(props);
  }

  public static create(raw: string): PhoneNumber {
    const normalised = raw.replace(/[\s()-]/g, '');

    if (normalised.length === 0) {
      throw new ValidationException('Phone number is required');
    }
    if (!PHONE_PATTERN.test(normalised)) {
      throw new ValidationException('Phone number is not a valid international number');
    }

    return new PhoneNumber({ value: normalised });
  }

  public get value(): string {
    return this.props.value;
  }
}
