import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { FamilyAccessLevel } from '@modules/family-contacts/domain/family-access-level.enum';
import { FamilyCommunication } from '@modules/family-contacts/domain/family-communication.entity';
import { FamilyCommunicationType } from '@modules/family-contacts/domain/family-communication-type.enum';
import { FamilyCommunicationRepository } from '@modules/family-contacts/domain/family-communication.repository';
import { FamilyContactRole } from '@modules/family-contacts/domain/family-contact-role.enum';
import { FamilyContact } from '@modules/family-contacts/domain/family-contact.entity';
import { FamilyContactRepository } from '@modules/family-contacts/domain/family-contact.repository';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AddFamilyContactUseCase } from './add-family-contact.use-case';
import { LogFamilyCommunicationUseCase } from './log-family-communication.use-case';
import { RemoveFamilyContactUseCase } from './remove-family-contact.use-case';
import { UpdateFamilyContactUseCase } from './update-family-contact.use-case';

const NOW = new Date('2026-07-24T00:00:00.000Z');
const clock: Clock = { now: () => NOW };
const R = 'r1';

function ids(): IdGenerator {
  let n = 0;
  return { generate: () => `id-${(n += 1)}` };
}

function recipients(exists: boolean): CareRecipientRepository {
  return {
    save: () => Promise.resolve(),
    findById: (id) =>
      Promise.resolve(exists && id === R ? ({ id } as unknown as CareRecipient) : null),
    findByIds: () => Promise.resolve([]),
    listByOwner: () => Promise.resolve([]),
  };
}

class ContactStore implements FamilyContactRepository {
  public items: FamilyContact[] = [];
  add(contact: FamilyContact): Promise<void> {
    this.items.push(contact);
    return Promise.resolve();
  }
  save(contact: FamilyContact): Promise<void> {
    const index = this.items.findIndex((c) => c.id === contact.id);
    if (index !== -1) {
      this.items[index] = contact;
    }
    return Promise.resolve();
  }
  findById(id: string): Promise<FamilyContact | null> {
    return Promise.resolve(this.items.find((c) => c.id === id) ?? null);
  }
  remove(id: string): Promise<void> {
    this.items = this.items.filter((c) => c.id !== id);
    return Promise.resolve();
  }
}

class CommunicationStore implements FamilyCommunicationRepository {
  public items: FamilyCommunication[] = [];
  add(communication: FamilyCommunication): Promise<void> {
    this.items.push(communication);
    return Promise.resolve();
  }
}

function seededContact(id: string): FamilyContact {
  return FamilyContact.register({
    id,
    careRecipientId: R,
    name: 'David Johnson',
    relationship: 'Son',
    roles: [FamilyContactRole.PrimaryContact],
    now: NOW,
  });
}

describe('family admin writes', () => {
  it('registers a family contact', async () => {
    const contacts = new ContactStore();
    const useCase = new AddFamilyContactUseCase(recipients(true), contacts, clock, ids());

    const { id } = await useCase.execute({
      recipientId: R,
      name: 'David Johnson',
      relationship: 'Son',
      roles: [FamilyContactRole.PrimaryContact, FamilyContactRole.PowerOfAttorney],
      accessLevel: FamilyAccessLevel.FullAccess,
    });

    expect(contacts.items).toHaveLength(1);
    expect(contacts.items[0].id).toBe(id);
    expect(contacts.items[0].hasRole(FamilyContactRole.PowerOfAttorney)).toBe(true);
  });

  it('rejects registering a contact for an unknown recipient', async () => {
    const useCase = new AddFamilyContactUseCase(
      recipients(false),
      new ContactStore(),
      clock,
      ids(),
    );
    await expect(
      useCase.execute({ recipientId: 'nope', name: 'X', relationship: 'Son' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('revises a contact in scope', async () => {
    const contacts = new ContactStore();
    contacts.items.push(seededContact('c1'));
    const useCase = new UpdateFamilyContactUseCase(contacts, clock);

    await useCase.execute({
      recipientId: R,
      contactId: 'c1',
      name: 'David Johnson',
      relationship: 'Son',
      accessLevel: FamilyAccessLevel.Limited,
    });

    expect(contacts.items[0].accessLevel).toBe(FamilyAccessLevel.Limited);
  });

  it('rejects revising a contact of another recipient', async () => {
    const contacts = new ContactStore();
    contacts.items.push(seededContact('c1'));
    const useCase = new UpdateFamilyContactUseCase(contacts, clock);
    await expect(
      useCase.execute({ recipientId: 'other', contactId: 'c1', name: 'X', relationship: 'Son' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('removes a contact in scope', async () => {
    const contacts = new ContactStore();
    contacts.items.push(seededContact('c1'));
    const useCase = new RemoveFamilyContactUseCase(contacts);

    await useCase.execute({ recipientId: R, contactId: 'c1' });

    expect(contacts.items).toHaveLength(0);
  });

  it('logs a communication against a contact in scope', async () => {
    const contacts = new ContactStore();
    contacts.items.push(seededContact('c1'));
    const communications = new CommunicationStore();
    const useCase = new LogFamilyCommunicationUseCase(contacts, communications, clock, ids());

    const { id } = await useCase.execute({
      recipientId: R,
      contactId: 'c1',
      type: FamilyCommunicationType.PhoneCall,
      subject: 'Evening care concern discussion',
      staffMemberName: 'Sarah Williams',
      occurredAt: new Date('2026-07-22T00:00:00.000Z'),
    });

    expect(communications.items).toHaveLength(1);
    expect(communications.items[0].id).toBe(id);
    expect(communications.items[0].familyContactId).toBe('c1');
  });

  it('rejects logging a communication against a contact of another recipient', async () => {
    const contacts = new ContactStore();
    contacts.items.push(seededContact('c1'));
    const useCase = new LogFamilyCommunicationUseCase(
      contacts,
      new CommunicationStore(),
      clock,
      ids(),
    );
    await expect(
      useCase.execute({
        recipientId: 'other',
        contactId: 'c1',
        type: FamilyCommunicationType.Email,
        subject: 'x',
        staffMemberName: 'Admin',
        occurredAt: NOW,
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
