import { ValidationException } from '@shared/domain/domain-exception';
import { Entity } from '@shared/domain/entity.base';
import { SosResponseEventKind } from './sos-response-event-kind.enum';

const MAX_DESCRIPTION_LENGTH = 500;

interface Props {
  sosAlertId: string;
  at: Date;
  kind: SosResponseEventKind;
  description: string;
  actorAdminId: string | null;
  linkedIncidentId: string | null;
}

/** An appended entry on an SOS emergency's response timeline. */
export class SosResponseEvent extends Entity<string> {
  private props: Props;

  private constructor(id: string, props: Props) {
    super(id);
    this.props = props;
  }

  public static append(params: {
    id: string;
    sosAlertId: string;
    kind: SosResponseEventKind;
    description: string;
    actorAdminId?: string | null;
    linkedIncidentId?: string | null;
    now: Date;
  }): SosResponseEvent {
    const description = params.description.trim();
    if (description.length === 0) {
      throw new ValidationException('A timeline entry needs a description');
    }
    return new SosResponseEvent(params.id, {
      sosAlertId: params.sosAlertId,
      at: params.now,
      kind: params.kind,
      description: description.slice(0, MAX_DESCRIPTION_LENGTH),
      actorAdminId: params.actorAdminId ?? null,
      linkedIncidentId: params.linkedIncidentId ?? null,
    });
  }

  public static rehydrate(id: string, props: Props): SosResponseEvent {
    return new SosResponseEvent(id, props);
  }

  public get sosAlertId(): string {
    return this.props.sosAlertId;
  }

  public get at(): Date {
    return this.props.at;
  }

  public get kind(): SosResponseEventKind {
    return this.props.kind;
  }

  public get description(): string {
    return this.props.description;
  }

  public get actorAdminId(): string | null {
    return this.props.actorAdminId;
  }

  public get linkedIncidentId(): string | null {
    return this.props.linkedIncidentId;
  }
}
