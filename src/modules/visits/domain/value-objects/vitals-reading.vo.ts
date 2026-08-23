import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';

interface VitalsReadingProps {
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  oxygenSaturation: number | null;
  weightGrams: number | null;
  recordedAt: Date;
}

// Plausible clinical bounds; well outside a real reading is treated as a typo.
const MAX_PRESSURE = 400;
const MAX_HEART_RATE = 400;
const MAX_WEIGHT_GRAMS = 500_000;

/**
 * A set of vital signs a caregiver recorded during a visit (blood pressure, heart
 * rate, oxygen saturation, weight). Every measure is optional so a caregiver can
 * record only what they took, but at least one must be present. Weight is whole
 * grams to keep money style integer precision (no floating point). `recordedAt`
 * is stamped server side. Immutable: each reading is a new value object.
 */
export class VitalsReading extends ValueObject<VitalsReadingProps> {
  private constructor(props: VitalsReadingProps) {
    super(props);
  }

  public static create(params: {
    systolic?: number | null;
    diastolic?: number | null;
    heartRate?: number | null;
    oxygenSaturation?: number | null;
    weightGrams?: number | null;
    recordedAt: Date;
  }): VitalsReading {
    const systolic = VitalsReading.cleanMeasure(params.systolic, 'Systolic', MAX_PRESSURE);
    const diastolic = VitalsReading.cleanMeasure(params.diastolic, 'Diastolic', MAX_PRESSURE);
    const heartRate = VitalsReading.cleanMeasure(params.heartRate, 'Heart rate', MAX_HEART_RATE);
    const oxygenSaturation = VitalsReading.cleanMeasure(
      params.oxygenSaturation,
      'Oxygen saturation',
      100,
    );
    const weightGrams = VitalsReading.cleanMeasure(params.weightGrams, 'Weight', MAX_WEIGHT_GRAMS);

    if (
      systolic === null &&
      diastolic === null &&
      heartRate === null &&
      oxygenSaturation === null &&
      weightGrams === null
    ) {
      throw new ValidationException('At least one vital sign must be recorded');
    }
    if (systolic !== null && diastolic !== null && diastolic > systolic) {
      throw new ValidationException('Diastolic pressure cannot be higher than systolic pressure');
    }
    if (Number.isNaN(params.recordedAt.getTime())) {
      throw new ValidationException('The time the vitals were recorded is not valid');
    }

    return new VitalsReading({
      systolic,
      diastolic,
      heartRate,
      oxygenSaturation,
      weightGrams,
      recordedAt: params.recordedAt,
    });
  }

  private static cleanMeasure(
    value: number | null | undefined,
    label: string,
    max: number,
  ): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (!Number.isInteger(value) || value < 0 || value > max) {
      throw new ValidationException(`${label} is out of the accepted range`);
    }
    return value;
  }

  public get systolic(): number | null {
    return this.props.systolic;
  }

  public get diastolic(): number | null {
    return this.props.diastolic;
  }

  public get heartRate(): number | null {
    return this.props.heartRate;
  }

  public get oxygenSaturation(): number | null {
    return this.props.oxygenSaturation;
  }

  public get weightGrams(): number | null {
    return this.props.weightGrams;
  }

  public get recordedAt(): Date {
    return this.props.recordedAt;
  }
}
