import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { CaregiverTrainingStatus } from './caregiver-training-status.enum';
import { DocumentFile } from './caregiver-document.entity';

const MAX_NAME_LENGTH = 200;
const MAX_FILE_NAME_LENGTH = 255;
const MAX_KEY_LENGTH = 500;
const MAX_UPLOADER_LENGTH = 120;
const MAX_HOURS = 100_000;

interface CaregiverTrainingProps {
  caregiverId: string;
  name: string;
  status: CaregiverTrainingStatus;
  completedAt: Date | null;
  certificate: boolean;
  hoursCompleted: number;
  hoursRequired: number | null;
  documentKey: string | null;
  fileName: string | null;
  uploadedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * CaregiverTraining aggregate root: one training course a caregiver has taken or is
 * taking. A record with a completion date is Completed; without one it is still In
 * Progress, tracked by hours completed against hours required. Any certificate file
 * is an opaque documentKey; blob storage and downloads are deferred.
 */
export class CaregiverTraining extends AggregateRoot<string> {
  private props: CaregiverTrainingProps;

  private constructor(id: string, props: CaregiverTrainingProps) {
    super(id);
    this.props = props;
  }

  public static record(params: {
    id: string;
    caregiverId: string;
    name: string;
    completedAt?: Date | null;
    certificate?: boolean;
    hoursCompleted?: number;
    hoursRequired?: number | null;
    file?: DocumentFile;
    now: Date;
  }): CaregiverTraining {
    const file = params.file ?? {};
    const completedAt = params.completedAt ?? null;
    return new CaregiverTraining(params.id, {
      caregiverId: requireId(params.caregiverId),
      name: assertName(params.name),
      status:
        completedAt === null
          ? CaregiverTrainingStatus.InProgress
          : CaregiverTrainingStatus.Completed,
      completedAt,
      certificate: params.certificate ?? false,
      hoursCompleted: assertHours(params.hoursCompleted ?? 0, 'hours completed'),
      hoursRequired:
        params.hoursRequired === null || params.hoursRequired === undefined
          ? null
          : assertHours(params.hoursRequired, 'hours required'),
      documentKey: clean(file.documentKey, MAX_KEY_LENGTH),
      fileName: clean(file.fileName, MAX_FILE_NAME_LENGTH),
      uploadedBy: clean(file.uploadedBy, MAX_UPLOADER_LENGTH),
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  public static rehydrate(id: string, props: CaregiverTrainingProps): CaregiverTraining {
    return new CaregiverTraining(id, props);
  }

  public get caregiverId(): string {
    return this.props.caregiverId;
  }

  public get name(): string {
    return this.props.name;
  }

  public get status(): CaregiverTrainingStatus {
    return this.props.status;
  }

  public get completedAt(): Date | null {
    return this.props.completedAt;
  }

  public get certificate(): boolean {
    return this.props.certificate;
  }

  public get hoursCompleted(): number {
    return this.props.hoursCompleted;
  }

  public get hoursRequired(): number | null {
    return this.props.hoursRequired;
  }

  public get documentKey(): string | null {
    return this.props.documentKey;
  }

  public get fileName(): string | null {
    return this.props.fileName;
  }

  public get uploadedBy(): string | null {
    return this.props.uploadedBy;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}

function requireId(value: string): string {
  const clean = value.trim();
  if (clean.length === 0) {
    throw new ValidationException('A caregiver is required for a training record');
  }
  return clean;
}

function assertName(raw: string): string {
  const name = raw.trim();
  if (name.length === 0) {
    throw new ValidationException('Training name is required');
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new ValidationException('Training name exceeds the maximum length');
  }
  return name;
}

function assertHours(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0 || value > MAX_HOURS) {
    throw new ValidationException(`The ${label} value is out of range`);
  }
  return value;
}

function clean(value: string | null | undefined, max: number): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed.slice(0, max);
}
