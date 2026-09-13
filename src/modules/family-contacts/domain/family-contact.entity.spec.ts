import { ValidationException } from '@shared/domain/domain-exception';
import { FamilyAccessLevel } from './family-access-level.enum';
import { FamilyContactRole } from './family-contact-role.enum';
import { FamilyContact } from './family-contact.entity';
import { FamilyPreferredContactMethod } from './family-preferred-contact-method.enum';

const NOW = new Date('2026-07-24T00:00:00.000Z');

function register(
  overrides: Partial<Parameters<typeof FamilyContact.register>[0]> = {},
): FamilyContact {
  return FamilyContact.register({
    id: 'c1',
    careRecipientId: 'r1',
    name: 'David Johnson',
    relationship: 'Son',
    now: NOW,
    ...overrides,
  });
}

describe('FamilyContact', () => {
  it('registers with sensible defaults', () => {
    const contact = register();
    expect(contact.roles).toEqual([]);
    expect(contact.accessLevel).toBe(FamilyAccessLevel.ViewOnly);
    expect(contact.portalLoginEnabled).toBe(false);
    expect(contact.preferredMethod).toBeNull();
  });

  it('requires a name and a relationship', () => {
    expect(() => register({ name: '  ' })).toThrow(ValidationException);
    expect(() => register({ relationship: '' })).toThrow(ValidationException);
  });

  it('deduplicates roles and reports membership', () => {
    const contact = register({
      roles: [
        FamilyContactRole.EmergencyContact,
        FamilyContactRole.EmergencyContact,
        FamilyContactRole.PowerOfAttorney,
      ],
    });
    expect(contact.roles).toEqual([
      FamilyContactRole.EmergencyContact,
      FamilyContactRole.PowerOfAttorney,
    ]);
    expect(contact.hasRole(FamilyContactRole.PowerOfAttorney)).toBe(true);
    expect(contact.hasRole(FamilyContactRole.BillingContact)).toBe(false);
  });

  it('captures full access with a scope label and preferred method', () => {
    const contact = register({
      roles: [FamilyContactRole.PrimaryContact],
      accessLevel: FamilyAccessLevel.FullAccess,
      accessScopeLabel: 'All Records',
      authorizedSectionsLabel: 'All medical records, billing invoices',
      preferredMethod: FamilyPreferredContactMethod.Phone,
      portalLoginEnabled: true,
    });
    expect(contact.accessLevel).toBe(FamilyAccessLevel.FullAccess);
    expect(contact.accessScopeLabel).toBe('All Records');
    expect(contact.preferredMethod).toBe(FamilyPreferredContactMethod.Phone);
    expect(contact.portalLoginEnabled).toBe(true);
  });

  it('normalises empty optional details to null', () => {
    const contact = register({ phone: '   ', email: '' });
    expect(contact.phone).toBeNull();
    expect(contact.email).toBeNull();
  });

  it('revises the editable details wholesale', () => {
    const contact = register();
    const later = new Date('2026-07-25T00:00:00.000Z');
    contact.revise({
      name: 'David A. Johnson',
      relationship: 'Son',
      roles: [FamilyContactRole.BillingContact],
      accessLevel: FamilyAccessLevel.Limited,
      preferredMethod: FamilyPreferredContactMethod.SmsText,
      now: later,
    });
    expect(contact.name).toBe('David A. Johnson');
    expect(contact.roles).toEqual([FamilyContactRole.BillingContact]);
    expect(contact.accessLevel).toBe(FamilyAccessLevel.Limited);
    expect(contact.updatedAt).toEqual(later);
  });
});
