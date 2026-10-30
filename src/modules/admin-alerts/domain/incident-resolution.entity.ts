import { Entity } from '@shared/domain/entity.base';
import { IncidentResolutionStatus } from './incident-resolution-status.enum';

const MAX_TEXT_LENGTH = 1000;

interface Props {
  incidentId: string;
  status: IncidentResolutionStatus;
  summary: string | null;
  actionsTaken: string | null;
  followUpRequired: boolean;
  followUpDate: Date | null;
  followUpNotes: string | null;
  updatedByAdminId: string | null;
}

export interface IncidentResolutionFields {
  status?: IncidentResolutionStatus;
  summary?: string | null;
  actionsTaken?: string | null;
  followUpRequired?: boolean;
  followUpDate?: Date | null;
  followUpNotes?: string | null;
}

/** The resolution form draft for an incident (one per incident). */
export class IncidentResolution extends Entity<string> {
  private props: Props;

  private constructor(id: string, props: Props) {
    super(id);
    this.props = props;
  }

  /** A fresh, empty resolution draft for an incident. */
  public static start(id: string, incidentId: string): IncidentResolution {
    return new IncidentResolution(id, {
      incidentId,
      status: IncidentResolutionStatus.PendingResolution,
      summary: null,
      actionsTaken: null,
      followUpRequired: false,
      followUpDate: null,
      followUpNotes: null,
      updatedByAdminId: null,
    });
  }

  public static rehydrate(id: string, props: Props): IncidentResolution {
    return new IncidentResolution(id, props);
  }

  /** Apply the submitted form fields (only the provided ones change). */
  public apply(fields: IncidentResolutionFields, adminId: string): void {
    if (fields.status !== undefined) {
      this.props.status = fields.status;
    }
    if (fields.summary !== undefined) {
      this.props.summary = clip(fields.summary);
    }
    if (fields.actionsTaken !== undefined) {
      this.props.actionsTaken = clip(fields.actionsTaken);
    }
    if (fields.followUpRequired !== undefined) {
      this.props.followUpRequired = fields.followUpRequired;
    }
    if (fields.followUpDate !== undefined) {
      this.props.followUpDate = fields.followUpDate;
    }
    if (fields.followUpNotes !== undefined) {
      this.props.followUpNotes = clip(fields.followUpNotes);
    }
    this.props.updatedByAdminId = adminId;
  }

  /** Finalise the form as the incident is marked resolved. */
  public markResolved(): void {
    this.props.status = IncidentResolutionStatus.Resolved;
  }

  public get incidentId(): string {
    return this.props.incidentId;
  }

  public get status(): IncidentResolutionStatus {
    return this.props.status;
  }

  public get summary(): string | null {
    return this.props.summary;
  }

  public get actionsTaken(): string | null {
    return this.props.actionsTaken;
  }

  public get followUpRequired(): boolean {
    return this.props.followUpRequired;
  }

  public get followUpDate(): Date | null {
    return this.props.followUpDate;
  }

  public get followUpNotes(): string | null {
    return this.props.followUpNotes;
  }

  public get updatedByAdminId(): string | null {
    return this.props.updatedByAdminId;
  }
}

function clip(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed.slice(0, MAX_TEXT_LENGTH);
}
