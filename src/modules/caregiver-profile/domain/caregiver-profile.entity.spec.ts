import { ValidationException } from '@shared/domain/domain-exception';
import { CaregiverEmploymentType } from './caregiver-employment-type.enum';
import { CaregiverGender } from './caregiver-gender.enum';
import { CaregiverNoteKind } from './caregiver-note-kind.enum';
import { CaregiverProfile } from './caregiver-profile.entity';
import { CaregiverStatus } from './caregiver-status.enum';

const NOW = new Date('2026-09-20T10:00:00.000Z');
const LATER = new Date('2026-09-21T10:00:00.000Z');

function profile(): CaregiverProfile {
  return CaregiverProfile.create({
    id: 'cg-1',
    userId: 'user-1',
    fields: {
      title: 'Certified Nursing Assistant (CNA)',
      branch: 'North Branch',
      employmentType: CaregiverEmploymentType.FullTime,
      experienceYears: 6,
      joinedAt: new Date('2019-03-01T00:00:00.000Z'),
    },
    now: NOW,
  });
}

describe('CaregiverProfile', () => {
  it('creates active with the employment fields', () => {
    const p = profile();
    expect(p.status).toBe(CaregiverStatus.Active);
    expect(p.title).toBe('Certified Nursing Assistant (CNA)');
    expect(p.employmentType).toBe(CaregiverEmploymentType.FullTime);
    expect(p.experienceYears).toBe(6);
  });

  it('sets skills and languages, deduplicating and trimming', () => {
    const p = profile();
    p.setSkills([' Wound Care ', 'Wound Care', 'Dementia Care'], LATER);
    p.setLanguages(['English', 'Spanish', 'English'], LATER);
    expect(p.skills).toEqual(['Wound Care', 'Dementia Care']);
    expect(p.languages).toEqual(['English', 'Spanish']);
  });

  it('sets the emergency contact and status', () => {
    const p = profile();
    p.setEmergencyContact(
      {
        name: 'Mark Williams',
        phone: '(555) 234-5679',
        relationship: 'Husband',
        email: 'mark.w@email.com',
      },
      LATER,
    );
    p.setStatus(CaregiverStatus.OnLeave, LATER);
    expect(p.emergencyContact.name).toBe('Mark Williams');
    expect(p.emergencyContact.email).toBe('mark.w@email.com');
    expect(p.status).toBe(CaregiverStatus.OnLeave);
  });

  it('revises gender, supervisor, max hours and preferred shift', () => {
    const p = profile();
    p.reviseProfile(
      {
        gender: CaregiverGender.Female,
        supervisorName: 'Mike Chen',
        maxHoursPerWeek: 45,
        preferredShift: 'Morning',
      },
      LATER,
    );
    expect(p.gender).toBe(CaregiverGender.Female);
    expect(p.supervisorName).toBe('Mike Chen');
    expect(p.maxHoursPerWeek).toBe(45);
    expect(p.preferredShift).toBe('Morning');
  });

  it('rejects an out of range maximum hours per week', () => {
    const p = profile();
    expect(() => p.reviseProfile({ maxHoursPerWeek: 200 }, LATER)).toThrow(ValidationException);
  });

  it('sets and clears the preferences note', () => {
    const p = profile();
    p.setPreferencesNote('  Prefers morning shifts.  ', LATER);
    expect(p.preferencesNote).toBe('Prefers morning shifts.');
    p.setPreferencesNote(null, LATER);
    expect(p.preferencesNote).toBeNull();
  });

  it('archives idempotently and reports it', () => {
    const p = profile();
    expect(p.isArchived).toBe(false);
    p.archive(LATER);
    expect(p.isArchived).toBe(true);
    expect(p.archivedAt).toEqual(LATER);
    p.archive(NOW);
    expect(p.archivedAt).toEqual(LATER);
  });

  it('appends notes and pulls the pending ones once', () => {
    const p = profile();
    p.addNote({
      body: '  Excellent handling of medication schedule change.  ',
      kind: CaregiverNoteKind.Supervisor,
      authorAdminId: 'admin-1',
      authorName: 'Mike Chen',
      authorRole: 'Care Coordinator',
      now: LATER,
    });
    expect(p.noteLog[0].body).toBe('Excellent handling of medication schedule change.');
    expect(p.noteLog[0].kind).toBe(CaregiverNoteKind.Supervisor);
    expect(p.pullPendingNotes()).toHaveLength(1);
    expect(p.pullPendingNotes()).toHaveLength(0);
  });

  it('rejects experience years out of range', () => {
    expect(() =>
      CaregiverProfile.create({ id: 'x', userId: 'u', fields: { experienceYears: 200 }, now: NOW }),
    ).toThrow(ValidationException);
  });
});
