import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';

interface HealthInformationProps {
  medicalConditions: string[];
  allergies: string[];
  needsMedicationHelp: boolean;
}

interface HealthInformationInput {
  medicalConditions?: string[];
  allergies?: string[];
  needsMedicationHelp: boolean;
}

const MAX_ITEM_LENGTH = 200;
const MAX_ITEMS = 50;

/**
 * Health information for the care recipient: free text lists of conditions and
 * allergies, plus whether the family needs help managing medication. The
 * medication schedule itself is a structured collection owned directly by the
 * CareRecipient aggregate (see the Medication entity), because a caregiver
 * records administration against individual entries. This is sensitive personal
 * data and must never be logged.
 */
export class HealthInformation extends ValueObject<HealthInformationProps> {
  private constructor(props: HealthInformationProps) {
    super(props);
  }

  public static create(input: HealthInformationInput): HealthInformation {
    const medicalConditions = HealthInformation.cleanList(
      input.medicalConditions,
      'Medical conditions',
    );
    const allergies = HealthInformation.cleanList(input.allergies, 'Allergies');

    return new HealthInformation({
      medicalConditions,
      allergies,
      needsMedicationHelp: input.needsMedicationHelp,
    });
  }

  private static cleanList(raw: string[] | undefined, label: string): string[] {
    const items = raw ?? [];
    if (items.length > MAX_ITEMS) {
      throw new ValidationException(`${label} has too many entries`);
    }
    const cleaned = items.map((item) => item.trim()).filter((item) => item.length > 0);
    for (const item of cleaned) {
      if (item.length > MAX_ITEM_LENGTH) {
        throw new ValidationException(`A ${label.toLowerCase()} entry exceeds the maximum length`);
      }
    }
    return cleaned;
  }

  public get medicalConditions(): string[] {
    return [...this.props.medicalConditions];
  }

  public get allergies(): string[] {
    return [...this.props.allergies];
  }

  public get needsMedicationHelp(): boolean {
    return this.props.needsMedicationHelp;
  }
}
