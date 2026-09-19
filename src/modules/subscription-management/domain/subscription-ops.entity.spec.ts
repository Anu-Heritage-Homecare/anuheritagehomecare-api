import { ValidationException } from '@shared/domain/domain-exception';
import { SubscriptionOps } from './subscription-ops.entity';
import { SubscriptionOpsEventType } from './subscription-ops-event-type.enum';

const T0 = new Date('2026-03-17T09:00:00.000Z');
const T1 = new Date('2026-06-01T09:00:00.000Z');
const CYCLE_END = new Date('2026-11-15T00:00:00.000Z');

function ops(): SubscriptionOps {
  return SubscriptionOps.create({
    id: 'ops-1',
    subscriptionId: 'sub-1',
    contractStartAt: new Date('2026-03-15T00:00:00.000Z'),
    activatedAt: T0,
    now: T0,
  });
}

describe('SubscriptionOps', () => {
  it('creates with a CREATED event and the onboarding dates', () => {
    const record = ops();
    expect(record.subscriptionId).toBe('sub-1');
    expect(record.timeline).toHaveLength(1);
    expect(record.timeline[0].type).toBe(SubscriptionOpsEventType.Created);
  });

  it('sets a flexible hours cycle and computes remaining hours', () => {
    const record = ops();
    record.setFlexibleHours(400, 285, CYCLE_END, 'admin-1', T0);
    expect(record.flexAllocatedTenths).toBe(400);
    expect(record.flexConsumedTenths).toBe(285);
    expect(record.flexRemainingTenths).toBe(115);
  });

  it('adds hours, logging the delta on the timeline', () => {
    const record = ops();
    record.setFlexibleHours(400, 285, CYCLE_END, 'admin-1', T0);
    record.addHours(100, 'admin-1', T1);
    expect(record.flexAllocatedTenths).toBe(500);
    const added = record.timeline.find((e) => e.type === SubscriptionOpsEventType.HoursAdded);
    expect(added?.hoursDeltaTenths).toBe(100);
  });

  it('records a renewal, resetting consumed hours to zero', () => {
    const record = ops();
    record.setFlexibleHours(400, 285, CYCLE_END, 'admin-1', T0);
    record.recordRenewal('Premium plan monthly cycle successfully renewed.', 'System', T1);
    expect(record.flexConsumedTenths).toBe(0);
    expect(record.timeline.at(-1)?.type).toBe(SubscriptionOpsEventType.RenewalCompleted);
  });

  it('assigns a coordinator and appends notes, rejecting an empty note', () => {
    const record = ops();
    record.assignCoordinator('coord-1', 'admin-1', T0);
    expect(record.coordinatorId).toBe('coord-1');
    record.addNote('  Family prefers morning visits  ', 'admin-1', 'Sarah Jenkins', T1);
    expect(record.noteLog).toHaveLength(1);
    expect(record.noteLog[0].body).toBe('Family prefers morning visits');
    expect(() => record.addNote('   ', 'admin-1', null, T1)).toThrow(ValidationException);
  });

  it('pulls pending events and notes once for persistence', () => {
    const record = ops();
    record.addNote('note', 'admin-1', null, T0);
    expect(record.pullPendingEvents().length).toBeGreaterThanOrEqual(1);
    expect(record.pullPendingNotes()).toHaveLength(1);
    expect(record.pullPendingEvents()).toHaveLength(0);
    expect(record.pullPendingNotes()).toHaveLength(0);
  });
});
