import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';

interface HealthInformationProps {
  medicalConditions: string[];
  allergies: string[];
  needsMedicationHelp: boolean;
  medications: string[];
}

interface HealthInformationInput {
  medicalConditions?: string[];
  allergies?: string[];
  needsMedicationHelp: boolean;
  medications?: string[];
}

const MAX_ITEM_LENGTH = 200;
const MAX_ITEMS = 50;

/**
 * Health and medication information for the care recipient. Conditions,
 * allergies and medications are free text lists entered by the family. When the
 * family indicates no medication help is needed, the medication list must be
 * empty so the two never contradict each other. This is sensitive personal data
 * and must never be logged.
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
    const medications = HealthInformation.cleanList(input.medications, 'Medications');

    if (!input.needsMedicationHelp && medications.length > 0) {
      throw new ValidationException(
        'Medications cannot be listed when no medication help is needed',
      );
    }

    return new HealthInformation({
      medicalConditions,
      allergies,
      needsMedicationHelp: input.needsMedicationHelp,
      medications,
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

  public get medications(): string[] {
    return [...this.props.medications];
  }
}
