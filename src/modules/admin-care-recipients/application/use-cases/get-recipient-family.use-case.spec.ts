import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { FamilyAccessLevel } from '@modules/family-contacts/domain/family-access-level.enum';
import { FamilyCommunicationType } from '@modules/family-contacts/domain/family-communication-type.enum';
import { FamilyContactRole } from '@modules/family-contacts/domain/family-contact-role.enum';
import { FamilyPreferredContactMethod } from '@modules/family-contacts/domain/family-preferred-contact-method.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  CommunicationRowView,
  FamilyContactRowView,
  RecipientFamilyReadModel,
} from '../ports/recipient-family-read.port';
import { GetRecipientFamilyUseCase } from './get-recipient-family.use-case';

const NOW = new Date('2026-07-24T10:00:00.000Z');
const clock: Clock = { now: () => NOW };
const R = 'r1';

function recipients(exists: boolean): CareRecipientRepository {
  return {
    save: () => Promise.resolve(),
    findById: (id) =>
      Promise.resolve(exists && id === R ? ({ id } as unknown as CareRecipient) : null),
    findByIds: () => Promise.resolve([]),
    listByOwner: () => Promise.resolve([]),
  };
}

const CONTACTS: FamilyContactRowView[] = [
  {
    id: 'c1',
    name: 'David Johnson',
    relationship: 'Son',
    roles: [
      FamilyContactRole.PrimaryContact,
      FamilyContactRole.EmergencyContact,
      FamilyContactRole.PowerOfAttorney,
      FamilyContactRole.BillingContact,
    ],
    roleNote: null,
    phone: '(555) 123-4567',
    email: 'david.johnson@email.com',
    address: '142 Oak Street, Springfield',
    accessLevel: FamilyAccessLevel.FullAccess,
    accessScopeLabel: 'All Records',
    authorizedSectionsLabel: 'All medical records, billing invoices',
    preferredMethod: FamilyPreferredContactMethod.Phone,
    portalLoginEnabled: true,
    lastContactAt: NOW,
    lastContactType: FamilyCommunicationType.AppMessage,
  },
  {
    id: 'c2',
    name: 'Sarah Johnson',
    relationship: 'Daughter-in-law',
    roles: [FamilyContactRole.SecondaryContact],
    roleNote: null,
    phone: null,
    email: 'sarah@email.com',
    address: null,
    accessLevel: FamilyAccessLevel.ViewOnly,
    accessScopeLabel: null,
    authorizedSectionsLabel: 'Daily visit logs, vitals trackers',
    preferredMethod: FamilyPreferredContactMethod.AppMessage,
    portalLoginEnabled: true,
    lastContactAt: null,
    lastContactType: null,
  },
];

const LOG: CommunicationRowView[] = [
  {
    id: 'm1',
    familyContactId: 'c1',
    familyMemberName: 'David Johnson',
    type: FamilyCommunicationType.AppMessage,
    subject: 'Schedule update for next week',
    staffMemberName: 'Mike Chen',
    occurredAt: NOW,
  },
];

class FakeReadModel implements RecipientFamilyReadModel {
  public since: Date | null = null;
  listContacts(): Promise<FamilyContactRowView[]> {
    return Promise.resolve(CONTACTS);
  }
  communicationLog(_id: string, since: Date): Promise<CommunicationRowView[]> {
    this.since = since;
    return Promise.resolve(LOG);
  }
}

describe('GetRecipientFamilyUseCase', () => {
  it('derives the summary cards from the contacts', async () => {
    const useCase = new GetRecipientFamilyUseCase(recipients(true), new FakeReadModel(), clock);
    const result = await useCase.execute(R);

    expect(result.summary.primaryContact).toEqual({ name: 'David Johnson', relationship: 'Son' });
    expect(result.summary.emergencyContact.name).toBe('David Johnson');
    expect(result.summary.powerOfAttorney.name).toBe('David Johnson');
    expect(result.summary.totalMembers).toBe(2);
  });

  it('maps the tier badge, roles, last contact and permissions matrix', async () => {
    const useCase = new GetRecipientFamilyUseCase(recipients(true), new FakeReadModel(), clock);
    const result = await useCase.execute(R);

    expect(result.contacts[0].tier).toBe('PRIMARY_CONTACT');
    expect(result.contacts[1].tier).toBe('SECONDARY_CONTACT');
    expect(result.contacts[0].roles).toContain('BILLING_CONTACT');
    expect(result.contacts[0].lastContactType).toBe('APP_MESSAGE');
    expect(result.contacts[1].lastContactAt).toBeNull();

    expect(result.permissionsMatrix).toEqual([
      {
        familyMemberName: 'David Johnson',
        accessLevel: 'FULL_ACCESS',
        authorizedSectionsLabel: 'All medical records, billing invoices',
        portalLoginEnabled: true,
      },
      {
        familyMemberName: 'Sarah Johnson',
        accessLevel: 'VIEW_ONLY',
        authorizedSectionsLabel: 'Daily visit logs, vitals trackers',
        portalLoginEnabled: true,
      },
    ]);
  });

  it('asks the log for the last 30 days and maps its rows', async () => {
    const readModel = new FakeReadModel();
    const useCase = new GetRecipientFamilyUseCase(recipients(true), readModel, clock);
    const result = await useCase.execute(R);

    expect(readModel.since).toEqual(new Date('2026-06-24T10:00:00.000Z'));
    expect(result.communicationLog[0]).toEqual({
      id: 'm1',
      familyMemberName: 'David Johnson',
      type: 'APP_MESSAGE',
      subject: 'Schedule update for next week',
      staffMemberName: 'Mike Chen',
      occurredAt: NOW,
    });
  });

  it('rejects an unknown recipient', async () => {
    const useCase = new GetRecipientFamilyUseCase(recipients(false), new FakeReadModel(), clock);
    await expect(useCase.execute('nope')).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
