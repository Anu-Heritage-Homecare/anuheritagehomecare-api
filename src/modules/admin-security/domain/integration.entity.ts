import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { IntegrationCategory } from './integration-category.enum';
import { IntegrationStatus } from './integration-status.enum';

const MAX_NAME = 160;
const MAX_DESCRIPTION = 300;

/** Opaque per integration configuration; its shape is validated at the API edge. */
export type IntegrationConfig = Record<string, unknown>;

interface IntegrationProps {
  key: string;
  name: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  description: string | null;
  config: IntegrationConfig | null;
  connectedAt: Date | null;
  lastSyncAt: Date | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** A third party integration with its connection status (the Integrations tab). */
export class Integration extends AggregateRoot<string> {
  private props: IntegrationProps;

  private constructor(id: string, props: IntegrationProps) {
    super(id);
    this.props = props;
  }

  public static rehydrate(id: string, props: IntegrationProps): Integration {
    return new Integration(id, props);
  }

  /** Connect or disconnect the integration (the status toggle). */
  public setStatus(status: IntegrationStatus, now: Date): void {
    if (status !== IntegrationStatus.Connected && status !== IntegrationStatus.Disconnected) {
      throw new ValidationException('Unknown integration status');
    }
    if (status === IntegrationStatus.Connected) {
      this.props.connectedAt ??= now;
    } else {
      // Disconnecting ends the connection and clears its sync metadata; the stored
      // config is kept so reconnecting restores the previous settings.
      this.props.connectedAt = null;
      this.props.lastSyncAt = null;
    }
    this.props.status = status;
    this.props.updatedAt = now;
  }

  /** Replace the stored configuration (the Save Configuration action). */
  public configure(config: IntegrationConfig, now: Date): void {
    if (this.props.status !== IntegrationStatus.Connected) {
      throw new ValidationException('Connect the integration before configuring it');
    }
    this.props.config = config;
    this.props.updatedAt = now;
  }

  /** Stamp a successful sync (for a future sync engine; not set by a connection test). */
  public recordSuccessfulSync(now: Date): void {
    this.props.lastSyncAt = now;
    this.props.updatedAt = now;
  }

  public get key(): string {
    return this.props.key;
  }
  public get name(): string {
    return this.props.name;
  }
  public get category(): IntegrationCategory {
    return this.props.category;
  }
  public get status(): IntegrationStatus {
    return this.props.status;
  }
  public get description(): string | null {
    return this.props.description;
  }
  public get config(): IntegrationConfig | null {
    return this.props.config;
  }
  public get connectedAt(): Date | null {
    return this.props.connectedAt;
  }
  public get lastSyncAt(): Date | null {
    return this.props.lastSyncAt;
  }
  public get sortOrder(): number {
    return this.props.sortOrder;
  }
  public get createdAt(): Date {
    return this.props.createdAt;
  }
  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** Expose the validation bounds for mappers/seed consistency. */
  public static readonly limits = { maxName: MAX_NAME, maxDescription: MAX_DESCRIPTION };
}
