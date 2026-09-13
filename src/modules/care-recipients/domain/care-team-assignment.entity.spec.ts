import { ValidationException } from '@shared/domain/domain-exception';
import { CareTeamAssignment } from './care-team-assignment.entity';
import { CareTeamRole } from './care-team-role.enum';

const NOW = new Date('2026-07-12T00:00:00.000Z');

describe('CareTeamAssignment', () => {
  it('assigns a caregiver to a role, active and trimmed', () => {
    const assignment = CareTeamAssignment.assign({
      id: 'a1',
      careRecipientId: 'r1',
      caregiverId: 'cg1',
      role: CareTeamRole.Primary,
      specialization: "  Alzheimer's Care ",
      scheduleLabel: '  Mon-Fri, 8AM-5PM ',
      now: NOW,
    });
    expect(assignment.caregiverId).toBe('cg1');
    expect(assignment.role).toBe(CareTeamRole.Primary);
    expect(assignment.specialization).toBe("Alzheimer's Care");
    expect(assignment.scheduleLabel).toBe('Mon-Fri, 8AM-5PM');
    expect(assignment.assignedAt).toEqual(NOW);
    expect(assignment.isActive).toBe(true);
    expect(assignment.removedAt).toBeNull();
  });

  it('defaults optional details to null', () => {
    const assignment = CareTeamAssignment.assign({
      id: 'a1',
      careRecipientId: 'r1',
      caregiverId: 'cg1',
      role: CareTeamRole.Backup,
      now: NOW,
    });
    expect(assignment.specialization).toBeNull();
    expect(assignment.scheduleLabel).toBeNull();
  });

  it('rejects a blank caregiver', () => {
    expect(() =>
      CareTeamAssignment.assign({
        id: 'a1',
        careRecipientId: 'r1',
        caregiverId: '   ',
        role: CareTeamRole.Primary,
        now: NOW,
      }),
    ).toThrow(ValidationException);
  });

  it('revises the role and details', () => {
    const assignment = CareTeamAssignment.assign({
      id: 'a1',
      careRecipientId: 'r1',
      caregiverId: 'cg1',
      role: CareTeamRole.Backup,
      now: NOW,
    });
    assignment.revise({ role: CareTeamRole.Primary, specialization: 'Personal Hygiene' });
    expect(assignment.role).toBe(CareTeamRole.Primary);
    expect(assignment.specialization).toBe('Personal Hygiene');
  });

  it('removes the assignment, stamping the removal time', () => {
    const assignment = CareTeamAssignment.assign({
      id: 'a1',
      careRecipientId: 'r1',
      caregiverId: 'cg1',
      role: CareTeamRole.Primary,
      now: NOW,
    });
    const removedAt = new Date('2026-08-01T00:00:00.000Z');
    assignment.remove(removedAt);
    expect(assignment.isActive).toBe(false);
    expect(assignment.removedAt).toEqual(removedAt);
    expect(() => assignment.remove(removedAt)).toThrow(ValidationException);
  });
});
