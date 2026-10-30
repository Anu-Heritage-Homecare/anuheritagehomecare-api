import { ValidationException } from '@shared/domain/domain-exception';
import { Entity } from '@shared/domain/entity.base';
import { IncidentTimelineEventKind } from './incident-timeline-event-kind.enum';

const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_ACTOR_NAME_LENGTH = 160;
const MAX_ACTOR_ROLE_LENGTH = 80;

interface Props {
  incidentId: string;
  at: Date;
  kind: IncidentTimelineEventKind;
  title: string;
  description: string;
  actorName: string | null;
  actorRole: string | null;
  authorAdminId: string | null;
}

/** An appended entry on an incident's history timeline. */
export class IncidentTimelineEvent extends Entity<string> {
  private props: Props;

  private constructor(id: string, props: Props) {
    super(id);
    this.props = props;
  }

  public static append(params: {
    id: string;
    incidentId: string;
    kind: IncidentTimelineEventKind;
    title: string;
    description: string;
    actorName?: string | null;
    actorRole?: string | null;
    authorAdminId?: string | null;
    now: Date;
  }): IncidentTimelineEvent {
    const title = params.title.trim();
    const description = params.description.trim();
    if (title.length === 0) {
      throw new ValidationException('A timeline entry needs a title');
    }
    if (description.length === 0) {
      throw new ValidationException('A timeline entry needs a description');
    }
    return new IncidentTimelineEvent(params.id, {
      incidentId: params.incidentId,
      at: params.now,
      kind: params.kind,
      title: title.slice(0, MAX_TITLE_LENGTH),
      description: description.slice(0, MAX_DESCRIPTION_LENGTH),
      actorName: clip(params.actorName, MAX_ACTOR_NAME_LENGTH),
      actorRole: clip(params.actorRole, MAX_ACTOR_ROLE_LENGTH),
      authorAdminId: params.authorAdminId ?? null,
    });
  }

  public static rehydrate(id: string, props: Props): IncidentTimelineEvent {
    return new IncidentTimelineEvent(id, props);
  }

  public get incidentId(): string {
    return this.props.incidentId;
  }

  public get at(): Date {
    return this.props.at;
  }

  public get kind(): IncidentTimelineEventKind {
    return this.props.kind;
  }

  public get title(): string {
    return this.props.title;
  }

  public get description(): string {
    return this.props.description;
  }

  public get actorName(): string | null {
    return this.props.actorName;
  }

  public get actorRole(): string | null {
    return this.props.actorRole;
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
