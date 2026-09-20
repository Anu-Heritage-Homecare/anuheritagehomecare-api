import { ValidationException } from '@shared/domain/domain-exception';
import { FamilyDirectoryEntry } from './family-directory-entry.entity';
import { FamilyDirectorySubjectKind } from './family-directory-subject-kind.enum';
import { FamilyMemberStatus } from './family-member-status.enum';

const NOW = new Date('2026-09-20T10:00:00.000Z');
const LATER = new Date('2026-09-21T10:00:00.000Z');

describe('FamilyDirectoryEntry', () => {
  it('registers an account entry active, linked to a user', () => {
    const entry = FamilyDirectoryEntry.registerAccount({
      id: 'fam-1',
      userId: 'user-1',
      fullName: '  David Johnson  ',
      relationship: 'Son / Primary',
      now: NOW,
    });
    expect(entry.subjectKind).toBe(FamilyDirectorySubjectKind.Account);
    expect(entry.userId).toBe('user-1');
    expect(entry.fullName).toBe('David Johnson');
    expect(entry.status).toBe(FamilyMemberStatus.Active);
  });

  it('registers a contact entry pending verification with inline details', () => {
    const entry = FamilyDirectoryEntry.registerContact({
      id: 'fam-2',
      fullName: 'Sarah Johnson',
      phone: '(555) 123-4568',
      email: 'sarah@example.com',
      relationship: 'Daughter in law',
      now: NOW,
    });
    expect(entry.subjectKind).toBe(FamilyDirectorySubjectKind.Contact);
    expect(entry.userId).toBeNull();
    expect(entry.phone).toBe('(555) 123-4568');
    expect(entry.status).toBe(FamilyMemberStatus.PendingVerification);
  });

  it('sets status, quick notes and the emergency contact verified flag', () => {
    const entry = FamilyDirectoryEntry.registerAccount({
      id: 'fam-1',
      userId: 'user-1',
      fullName: 'David Johnson',
      now: NOW,
    });
    entry.setStatus(FamilyMemberStatus.Inactive, LATER);
    entry.setQuickNotes('  Prefers phone calls over email.  ', LATER);
    entry.setEmergencyContactVerified(true, LATER);
    expect(entry.status).toBe(FamilyMemberStatus.Inactive);
    expect(entry.quickNotes).toBe('Prefers phone calls over email.');
    expect(entry.emergencyContactVerified).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(() =>
      FamilyDirectoryEntry.registerContact({ id: 'x', fullName: '   ', now: NOW }),
    ).toThrow(ValidationException);
  });
});
