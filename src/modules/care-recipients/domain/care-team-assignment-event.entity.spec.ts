import { ValidationException } from '@shared/domain/domain-exception';
import { CareTeamAction } from './care-team-action.enum';
import { CareTeamAssignmentEvent } from './care-team-assignment-event.entity';

const NOW = new Date('2026-07-12T00:00:00.000Z');

describe('CareTeamAssignmentEvent', () => {
  it('records an assignment history entry', () => {
    const event = CareTeamAssignmentEvent.record({
      id: 'h1',
      careRecipientId: 'r1',
      caregiverId: 'cg1',
      action: CareTeamAction.Assigned,
      reason: '  Primary caregiver assignment for full-time care plan ',
      byAdminId: 'admin-1',
      now: NOW,
    });
    expect(event.action).toBe(CareTeamAction.Assigned);
    expect(event.caregiverId).toBe('cg1');
    expect(event.reason).toBe('Primary caregiver assignment for full-time care plan');
    expect(event.byAdminId).toBe('admin-1');
    expect(event.createdAt).toEqual(NOW);
  });

  it('rejects a reason that is too long', () => {
    expect(() =>
      CareTeamAssignmentEvent.record({
        id: 'h1',
        careRecipientId: 'r1',
        caregiverId: 'cg1',
        action: CareTeamAction.Removed,
        reason: 'x'.repeat(501),
        now: NOW,
      }),
    ).toThrow(ValidationException);
  });
});
