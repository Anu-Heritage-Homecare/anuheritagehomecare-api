import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';

interface VitalsReadingProps {
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  oxygenSaturation: number | null;
  weightGrams: number | null;
  temperatureTenths: number | null;
  bloodGlucose: number | null;
  visitTaskPosition: number | null;
  recordedAt: Date;
}

// Plausible clinical bounds; well outside a real reading is treated as a typo.
const MAX_PRESSURE = 400;
const MAX_HEART_RATE = 400;
const MAX_WEIGHT_GRAMS = 500_000;
// Blood glucose in mg/dL; well outside is treated as a typo.
const MAX_BLOOD_GLUCOSE = 2000;
// Body temperature in tenths of a degree Celsius (30.0 to 45.0 C).
const MIN_TEMP_TENTHS = 300;
const MAX_TEMP_TENTHS = 450;

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
    temperatureCelsius?: number | null;
    bloodGlucose?: number | null;
    visitTaskPosition?: number | null;
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
    const temperatureTenths = VitalsReading.cleanTemperature(params.temperatureCelsius);
    const bloodGlucose = VitalsReading.cleanMeasure(
      params.bloodGlucose,
      'Blood glucose',
      MAX_BLOOD_GLUCOSE,
    );

    if (
      systolic === null &&
      diastolic === null &&
      heartRate === null &&
      oxygenSaturation === null &&
      weightGrams === null &&
      temperatureTenths === null &&
      bloodGlucose === null
    ) {
      throw new ValidationException('At least one vital sign must be recorded');
    }
    if (systolic !== null && diastolic !== null && diastolic > systolic) {
      throw new ValidationException('Diastolic pressure cannot be higher than systolic pressure');
    }
    if (Number.isNaN(params.recordedAt.getTime())) {
      throw new ValidationException('The time the vitals were recorded is not valid');
    }

    const visitTaskPosition = VitalsReading.cleanTaskPosition(params.visitTaskPosition);

    return new VitalsReading({
      systolic,
      diastolic,
      heartRate,
      oxygenSaturation,
      weightGrams,
      temperatureTenths,
      bloodGlucose,
      visitTaskPosition,
      recordedAt: params.recordedAt,
    });
  }

  /** A task position reference must be a non negative whole number, or null. */
  private static cleanTaskPosition(value: number | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (!Number.isInteger(value) || value < 0) {
      throw new ValidationException('A task position must be a non negative whole number');
    }
    return value;
  }

  /** Accept a Celsius reading with one decimal and store it as whole tenths. */
  private static cleanTemperature(value: number | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (!Number.isFinite(value)) {
      throw new ValidationException('Temperature is out of the accepted range');
    }
    const tenths = Math.round(value * 10);
    if (tenths < MIN_TEMP_TENTHS || tenths > MAX_TEMP_TENTHS) {
      throw new ValidationException('Temperature is out of the accepted range');
    }
    return tenths;
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

  /** Temperature in whole tenths of a degree Celsius, or null. */
  public get temperatureTenths(): number | null {
    return this.props.temperatureTenths;
  }

  /** Temperature in degrees Celsius (one decimal), or null. */
  public get temperatureCelsius(): number | null {
    return this.props.temperatureTenths === null ? null : this.props.temperatureTenths / 10;
  }

  /** Blood glucose in mg/dL, or null. */
  public get bloodGlucose(): number | null {
    return this.props.bloodGlucose;
  }

  /** The position of the visit task this was recorded under, or null. */
  public get visitTaskPosition(): number | null {
    return this.props.visitTaskPosition;
  }

  public get recordedAt(): Date {
    return this.props.recordedAt;
  }
}
