import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';
import { Gender } from '../gender.enum';

interface RecipientProfileProps {
  name: string;
  gender: Gender;
  dateOfBirth: Date;
  city: string;
  state: string;
  fullAddress: string;
  relationship: string;
  livingSituation: string;
  photoKey: string | null;
}

interface RecipientProfileInput {
  name: string;
  gender: string;
  dateOfBirth: Date;
  city: string;
  state: string;
  fullAddress: string;
  relationship: string;
  livingSituation: string;
  photoKey?: string | null;
}

const MAX_NAME_LENGTH = 200;
const MAX_LOCALITY_LENGTH = 120;
const MAX_ADDRESS_LENGTH = 300;
const MAX_PHOTO_KEY_LENGTH = 500;
const MAX_HUMAN_AGE_YEARS = 130;

/**
 * The identity profile captured on the first onboarding step: who the loved one
 * is and where they live. Free text fields (relationship, living situation) are
 * validated structurally only; the photo is stored as an opaque storage key, not
 * a binary, so uploads can be handled by a dedicated endpoint later.
 */
export class RecipientProfile extends ValueObject<RecipientProfileProps> {
  private constructor(props: RecipientProfileProps) {
    super(props);
  }

  public static create(input: RecipientProfileInput): RecipientProfile {
    const name = RecipientProfile.assertRequired(input.name, 'Name', MAX_NAME_LENGTH);
    const gender = RecipientProfile.toGender(input.gender);
    const dateOfBirth = RecipientProfile.assertBirthDate(input.dateOfBirth);
    const city = RecipientProfile.assertRequired(input.city, 'City', MAX_LOCALITY_LENGTH);
    const state = RecipientProfile.assertRequired(input.state, 'State', MAX_LOCALITY_LENGTH);
    const fullAddress = RecipientProfile.assertRequired(
      input.fullAddress,
      'Full address',
      MAX_ADDRESS_LENGTH,
    );
    const relationship = RecipientProfile.assertRequired(
      input.relationship,
      'Relationship',
      MAX_LOCALITY_LENGTH,
    );
    const livingSituation = RecipientProfile.assertRequired(
      input.livingSituation,
      'Living situation',
      MAX_LOCALITY_LENGTH,
    );
    const photoKey = RecipientProfile.normalisePhotoKey(input.photoKey);

    return new RecipientProfile({
      name,
      gender,
      dateOfBirth,
      city,
      state,
      fullAddress,
      relationship,
      livingSituation,
      photoKey,
    });
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

  private static toGender(raw: string): Gender {
    const normalised = raw.trim().toUpperCase();
    const match = Object.values(Gender).find((gender) => String(gender) === normalised);
    if (match === undefined) {
      throw new ValidationException('Gender must be one of MALE or FEMALE');
    }
    return match;
  }

  private static assertBirthDate(value: Date): Date {
    if (Number.isNaN(value.getTime())) {
      throw new ValidationException('Date of birth is not a valid date');
    }
    const now = Date.now();
    if (value.getTime() > now) {
      throw new ValidationException('Date of birth cannot be in the future');
    }
    const earliest = now - MAX_HUMAN_AGE_YEARS * 365.25 * 24 * 60 * 60 * 1000;
    if (value.getTime() < earliest) {
      throw new ValidationException('Date of birth is not a plausible date');
    }
    return value;
  }

  private static normalisePhotoKey(raw: string | null | undefined): string | null {
    const value = raw?.trim() ?? '';
    if (value.length === 0) {
      return null;
    }
    if (value.length > MAX_PHOTO_KEY_LENGTH) {
      throw new ValidationException('Photo key exceeds the maximum length');
    }
    return value;
  }

  public get name(): string {
    return this.props.name;
  }

  public get gender(): Gender {
    return this.props.gender;
  }

  public get dateOfBirth(): Date {
    return this.props.dateOfBirth;
  }

  public get city(): string {
    return this.props.city;
  }

  public get state(): string {
    return this.props.state;
  }

  public get fullAddress(): string {
    return this.props.fullAddress;
  }

  public get relationship(): string {
    return this.props.relationship;
  }

  public get livingSituation(): string {
    return this.props.livingSituation;
  }

  public get photoKey(): string | null {
    return this.props.photoKey;
  }
}
