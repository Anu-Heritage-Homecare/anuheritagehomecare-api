import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';
import { Country } from '../country.enum';

interface PostalAddressProps {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: Country;
}

interface PostalAddressInput {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

const MAX_LINE_LENGTH = 200;
const MAX_LOCALITY_LENGTH = 120;
const MAX_POSTAL_CODE_LENGTH = 20;

/**
 * A postal address for a user. The country is constrained to the served set so
 * downstream logic can rely on it. Structural validation only; the address is
 * not checked against a postal database.
 */
export class PostalAddress extends ValueObject<PostalAddressProps> {
  private constructor(props: PostalAddressProps) {
    super(props);
  }

  public static create(input: PostalAddressInput): PostalAddress {
    const line1 = PostalAddress.assertRequired(input.line1, 'Address line 1', MAX_LINE_LENGTH);
    const line2Raw = input.line2?.trim() ?? '';
    const line2 =
      line2Raw.length === 0
        ? null
        : PostalAddress.assertRequired(line2Raw, 'Address line 2', MAX_LINE_LENGTH);
    const city = PostalAddress.assertRequired(input.city, 'City', MAX_LOCALITY_LENGTH);
    const state = PostalAddress.assertRequired(input.state, 'State', MAX_LOCALITY_LENGTH);
    const postalCode = PostalAddress.assertRequired(
      input.postalCode,
      'Postal code',
      MAX_POSTAL_CODE_LENGTH,
    );
    const country = PostalAddress.toCountry(input.country);

    return new PostalAddress({ line1, line2, city, state, postalCode, country });
  }

  private static assertRequired(raw: string, label: string, maxLength: number): string {
    const value = raw.trim();
    if (value.length === 0) {
      throw new ValidationException(`${label} is required`);
    }
    if (value.length > maxLength) {
      throw new ValidationException(`${label} exceeds the maximum length`);
    }
    return value;
  }

  private static toCountry(raw: string): Country {
    const normalised = raw.trim().toUpperCase();
    const match = Object.values(Country).find((country) => String(country) === normalised);
    if (match === undefined) {
      throw new ValidationException('Country must be one of the supported countries (US, NG)');
    }
    return match;
  }

  public get line1(): string {
    return this.props.line1;
  }

  public get line2(): string | null {
    return this.props.line2;
  }

  public get city(): string {
    return this.props.city;
  }

  public get state(): string {
    return this.props.state;
  }

  public get postalCode(): string {
    return this.props.postalCode;
  }

  public get country(): Country {
    return this.props.country;
  }
}
