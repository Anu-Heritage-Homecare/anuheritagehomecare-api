import { ValidationException } from '@shared/domain/domain-exception';
import { Entity } from '@shared/domain/entity.base';
import { CommunicationChannel } from './communication-channel.enum';
import { CommunicationOutcome } from './communication-outcome.enum';

const MAX_CONTACT_NAME_LENGTH = 160;
const MAX_CONTACT_ROLE_LENGTH = 80;
const MAX_NOTES_LENGTH = 1000;

interface Props {
  incidentId: string;
  at: Date;
  channel: CommunicationChannel;
  outcome: CommunicationOutcome;
  contactName: string;
  contactRole: string | null;
  notes: string | null;
  authorAdminId: string | null;
}

/** A documented communication regarding an incident (a contact attempt). */
export class IncidentCommunication extends Entity<string> {
  private props: Props;

  private constructor(id: string, props: Props) {
    super(id);
    this.props = props;
  }

  public static record(params: {
    id: string;
    incidentId: string;
    channel: CommunicationChannel;
    outcome: CommunicationOutcome;
    contactName: string;
    contactRole?: string | null;
    notes?: string | null;
    authorAdminId?: string | null;
    now: Date;
  }): IncidentCommunication {
    const contactName = params.contactName.trim();
    if (contactName.length === 0) {
      throw new ValidationException('A communication needs a contact name');
    }
    return new IncidentCommunication(params.id, {
      incidentId: params.incidentId,
      at: params.now,
      channel: params.channel,
      outcome: params.outcome,
      contactName: contactName.slice(0, MAX_CONTACT_NAME_LENGTH),
      contactRole: clip(params.contactRole, MAX_CONTACT_ROLE_LENGTH),
      notes: clip(params.notes, MAX_NOTES_LENGTH),
      authorAdminId: params.authorAdminId ?? null,
    });
  }

  public static rehydrate(id: string, props: Props): IncidentCommunication {
    return new IncidentCommunication(id, props);
  }

  public get incidentId(): string {
    return this.props.incidentId;
  }

  public get at(): Date {
    return this.props.at;
  }

  public get channel(): CommunicationChannel {
    return this.props.channel;
  }

  public get outcome(): CommunicationOutcome {
    return this.props.outcome;
  }

  public get contactName(): string {
    return this.props.contactName;
  }

  public get contactRole(): string | null {
    return this.props.contactRole;
  }

  public get notes(): string | null {
    return this.props.notes;
  }

  public get authorAdminId(): string | null {
    return this.props.authorAdminId;
  }
}

function clip(value: string | null | undefined, max: number): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed.slice(0, max);
}
