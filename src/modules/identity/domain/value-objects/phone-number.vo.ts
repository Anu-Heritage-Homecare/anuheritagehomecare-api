import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';
import { Country } from '../country.enum';

interface PhoneNumberProps {
  value: string;
  country: Country;
}

// United States (NANP): national number is 10 digits and the area code must not
// begin with 0 or 1.
const US_NSN_PATTERN = /^[2-9]\d{9}$/;
// Nigeria mobile: 10 digit national significant number beginning 7, 8 or 9
// (for example 803..., 701..., 912...). The trunk 0 used for local dialling is
// stripped during normalisation.
const NG_NSN_PATTERN = /^[7-9]\d{9}$/;

/**
 * A phone number restricted to the two countries the app serves, the United
 * States and Nigeria. Input is accepted in E.164, international or local form
 * and normalised to a canonical E.164 string so the same number always compares
 * and persists identically.
 */
export class PhoneNumber extends ValueObject<PhoneNumberProps> {
  private constructor(props: PhoneNumberProps) {
    super(props);
  }

  public static create(raw: string): PhoneNumber {
    if (raw.trim().length === 0) {
      throw new ValidationException('Phone number is required');
    }

    // Reduce to digits only; separators and a leading + carry no information
    // once the country has been resolved.
    const digits = raw.replace(/\D/g, '');

    const resolved = PhoneNumber.resolve(digits);
    if (resolved === null) {
      throw new ValidationException('Phone number must be a valid United States or Nigeria number');
    }

    return new PhoneNumber(resolved);
  }

  private static resolve(digits: string): PhoneNumberProps | null {
    // United States: +1XXXXXXXXXX, 1XXXXXXXXXX, or a bare 10 digit NANP number.
    if (digits.length === 11 && digits.startsWith('1')) {
      return PhoneNumber.asUnitedStates(digits.slice(1));
    }
    // Nigeria: +234XXXXXXXXXX (optionally with the trunk 0 retained).
    if (digits.length === 13 && digits.startsWith('234')) {
      return PhoneNumber.asNigeria(digits.slice(3));
    }
    if (digits.length === 14 && digits.startsWith('2340')) {
      return PhoneNumber.asNigeria(digits.slice(4));
    }
    // Nigeria local dialling: 0XXXXXXXXXX.
    if (digits.length === 11 && digits.startsWith('0')) {
      return PhoneNumber.asNigeria(digits.slice(1));
    }
    // Bare 10 digit number with no country hint: only the United States uses a
    // trunkless 10 digit local format, so treat it as NANP.
    if (digits.length === 10) {
      return PhoneNumber.asUnitedStates(digits);
    }
    return null;
  }

  private static asUnitedStates(nsn: string): PhoneNumberProps | null {
    return US_NSN_PATTERN.test(nsn) ? { value: `+1${nsn}`, country: Country.UnitedStates } : null;
  }

  private static asNigeria(nsn: string): PhoneNumberProps | null {
    return NG_NSN_PATTERN.test(nsn) ? { value: `+234${nsn}`, country: Country.Nigeria } : null;
  }

  public get value(): string {
    return this.props.value;
  }

  public get country(): Country {
    return this.props.country;
  }
}
