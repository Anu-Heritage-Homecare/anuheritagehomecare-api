import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { SubscriptionOpsEventType } from './subscription-ops-event-type.enum';

/** One operational event on a subscription (activity timeline and audit log). */
export interface SubscriptionOpsEvent {
  type: SubscriptionOpsEventType;
  detail: string;
  hoursDeltaTenths: number | null;
  actorAdminId: string | null;
  actorLabel: string | null;
  occurredAt: Date;
}

/** One free text note on a subscription. */
export interface SubscriptionOpsNote {
  body: string;
  authorAdminId: string | null;
  authorName: string | null;
  createdAt: Date;
}

interface SubscriptionOpsProps {
  subscriptionId: string;
  coordinatorId: string | null;
  caregiverId: string | null;
  contractStartAt: Date | null;
  activatedAt: Date | null;
  flexAllocatedTenths: number | null;
  flexConsumedTenths: number | null;
  flexCycleEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SubscriptionOpsChildren {
  events: SubscriptionOpsEvent[];
  notes: SubscriptionOpsNote[];
}

const MAX_NOTE = 2000;

/**
 * The admin operational overlay for one subscription, keyed to the subscription id.
 * Holds the coordinator and caregiver assignment, the onboarding dates, the flexible
 * hours ledger (allocated, consumed, cycle end), the operational event log and free
 * text notes. The bookings Subscription itself stays lean.
 */
export class SubscriptionOps extends AggregateRoot<string> {
  private props: SubscriptionOpsProps;
  private readonly events: SubscriptionOpsEvent[];
  private readonly notes: SubscriptionOpsNote[];
  private readonly pendingEvents: SubscriptionOpsEvent[] = [];
  private readonly pendingNotes: SubscriptionOpsNote[] = [];

  private constructor(id: string, props: SubscriptionOpsProps, children: SubscriptionOpsChildren) {
    super(id);
    this.props = props;
    this.events = children.events;
    this.notes = children.notes;
  }

  public static create(params: {
    id: string;
    subscriptionId: string;
    coordinatorId?: string | null;
    caregiverId?: string | null;
    contractStartAt?: Date | null;
    activatedAt?: Date | null;
    now: Date;
  }): SubscriptionOps {
    const ops = new SubscriptionOps(
      params.id,
      {
        subscriptionId: params.subscriptionId,
        coordinatorId: params.coordinatorId ?? null,
        caregiverId: params.caregiverId ?? null,
        contractStartAt: params.contractStartAt ?? null,
        activatedAt: params.activatedAt ?? null,
        flexAllocatedTenths: null,
        flexConsumedTenths: null,
        flexCycleEndsAt: null,
        createdAt: params.now,
        updatedAt: params.now,
      },
      { events: [], notes: [] },
    );
    ops.record(SubscriptionOpsEventType.Created, 'Subscription record created', {
      now: params.now,
    });
    return ops;
  }

  public static rehydrate(
    id: string,
    props: SubscriptionOpsProps,
    children: SubscriptionOpsChildren,
  ): SubscriptionOps {
    return new SubscriptionOps(id, props, children);
  }

  public assignCoordinator(coordinatorId: string, adminId: string, now: Date): void {
    this.props.coordinatorId = requireId(coordinatorId, 'A coordinator is required');
    this.record(SubscriptionOpsEventType.CoordinatorAssigned, 'Coordinator assigned', {
      adminId,
      now,
    });
  }

  public assignCaregiver(caregiverId: string, adminId: string, now: Date): void {
    this.props.caregiverId = requireId(caregiverId, 'A caregiver is required');
    this.record(SubscriptionOpsEventType.CaregiverAssigned, 'Caregiver assigned', {
      adminId,
      now,
    });
  }

  /** Set the flexible hours allocation for the current cycle. */
  public setFlexibleHours(
    allocatedTenths: number,
    consumedTenths: number,
    cycleEndsAt: Date,
    adminId: string,
    now: Date,
  ): void {
    assertTenths(allocatedTenths);
    assertTenths(consumedTenths);
    this.props.flexAllocatedTenths = allocatedTenths;
    this.props.flexConsumedTenths = consumedTenths;
    this.props.flexCycleEndsAt = cycleEndsAt;
    this.record(SubscriptionOpsEventType.HoursAdjusted, 'Flexible hours cycle set', {
      adminId,
      now,
    });
  }

  /** Top up the allocation by a positive number of hours (tenths). */
  public addHours(deltaTenths: number, adminId: string, now: Date): void {
    if (!Number.isInteger(deltaTenths) || deltaTenths <= 0) {
      throw new ValidationException('Hours added must be a positive amount');
    }
    this.props.flexAllocatedTenths = (this.props.flexAllocatedTenths ?? 0) + deltaTenths;
    this.record(SubscriptionOpsEventType.HoursAdded, `${tenthsLabel(deltaTenths)} hours added`, {
      adminId,
      now,
      hoursDeltaTenths: deltaTenths,
    });
  }

  /** Set the consumed hours for the current cycle (a correction). */
  public adjustConsumed(consumedTenths: number, adminId: string, now: Date): void {
    assertTenths(consumedTenths);
    this.props.flexConsumedTenths = consumedTenths;
    this.record(SubscriptionOpsEventType.HoursAdjusted, 'Cycle balance adjusted', { adminId, now });
  }

  /** Extend the flexible hours cycle end date. */
  public extendExpiry(cycleEndsAt: Date, adminId: string, now: Date): void {
    this.props.flexCycleEndsAt = cycleEndsAt;
    this.record(SubscriptionOpsEventType.ExpiryExtended, 'Cycle expiry extended', { adminId, now });
  }

  /** Record that a renewal completed, rolling the consumed hours back to zero. */
  public recordRenewal(detail: string, actorLabel: string | null, now: Date): void {
    if (this.props.flexAllocatedTenths !== null) {
      this.props.flexConsumedTenths = 0;
    }
    this.record(SubscriptionOpsEventType.RenewalCompleted, detail, { now, actorLabel });
  }

  /** Mirror a lifecycle action from the subscription into the operational log. */
  public logLifecycle(
    type: SubscriptionOpsEventType,
    detail: string,
    adminId: string,
    now: Date,
  ): void {
    this.record(type, detail, { adminId, now });
  }

  public addNote(body: string, authorAdminId: string, authorName: string | null, now: Date): void {
    const clean = body.trim();
    if (clean.length === 0 || clean.length > MAX_NOTE) {
      throw new ValidationException('A note must be within the length limit');
    }
    const note: SubscriptionOpsNote = {
      body: clean,
      authorAdminId,
      authorName,
      createdAt: now,
    };
    this.notes.push(note);
    this.pendingNotes.push(note);
    this.props.updatedAt = now;
  }

  private record(
    type: SubscriptionOpsEventType,
    detail: string,
    options: {
      now: Date;
      adminId?: string | null;
      actorLabel?: string | null;
      hoursDeltaTenths?: number;
    },
  ): void {
    const event: SubscriptionOpsEvent = {
      type,
      detail,
      hoursDeltaTenths: options.hoursDeltaTenths ?? null,
      actorAdminId: options.adminId ?? null,
      actorLabel: options.actorLabel ?? null,
      occurredAt: options.now,
    };
    this.events.push(event);
    this.pendingEvents.push(event);
    this.props.updatedAt = options.now;
  }

  public pullPendingEvents(): SubscriptionOpsEvent[] {
    const events = [...this.pendingEvents];
    this.pendingEvents.length = 0;
    return events;
  }

  public pullPendingNotes(): SubscriptionOpsNote[] {
    const notes = [...this.pendingNotes];
    this.pendingNotes.length = 0;
    return notes;
  }

  public get subscriptionId(): string {
    return this.props.subscriptionId;
  }

  public get coordinatorId(): string | null {
    return this.props.coordinatorId;
  }

  public get caregiverId(): string | null {
    return this.props.caregiverId;
  }

  public get contractStartAt(): Date | null {
    return this.props.contractStartAt;
  }

  public get activatedAt(): Date | null {
    return this.props.activatedAt;
  }

  public get flexAllocatedTenths(): number | null {
    return this.props.flexAllocatedTenths;
  }

  public get flexConsumedTenths(): number | null {
    return this.props.flexConsumedTenths;
  }

  public get flexRemainingTenths(): number | null {
    if (this.props.flexAllocatedTenths === null) {
      return null;
    }
    return Math.max(0, this.props.flexAllocatedTenths - (this.props.flexConsumedTenths ?? 0));
  }

  public get flexCycleEndsAt(): Date | null {
    return this.props.flexCycleEndsAt;
  }

  public get timeline(): SubscriptionOpsEvent[] {
    return [...this.events];
  }

  public get noteLog(): SubscriptionOpsNote[] {
    return [...this.notes];
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}

function requireId(value: string, message: string): string {
  const clean = value.trim();
  if (clean.length === 0) {
    throw new ValidationException(message);
  }
  return clean;
}

function assertTenths(value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new ValidationException('Hours must be a non negative amount');
  }
}

function tenthsLabel(tenths: number): string {
  return (tenths / 10).toFixed(1);
}
