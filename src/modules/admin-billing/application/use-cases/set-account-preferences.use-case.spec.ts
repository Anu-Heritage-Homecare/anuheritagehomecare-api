import { FamilyDirectoryEntry } from '@modules/family-directory/domain/family-directory-entry.entity';
import { FamilyDirectoryEntryRepository } from '@modules/family-directory/domain/family-directory-entry.repository';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { SetAccountPreferencesUseCase } from './set-account-preferences.use-case';

const NOW = new Date('2026-11-06T10:00:00.000Z');
const clock = { now: () => NOW };

function store(initial: FamilyDirectoryEntry[] = []): FamilyDirectoryEntryRepository {
  const items = [...initial];
  return {
    save: (entry) => {
      if (!items.includes(entry)) {
        items.push(entry);
      }
      return Promise.resolve();
    },
    saveMany: () => Promise.resolve(),
    findById: (id) => Promise.resolve(items.find((e) => e.id === id) ?? null),
    findByUserId: () => Promise.resolve(null),
    findByIds: () => Promise.resolve([]),
  };
}

describe('SetAccountPreferencesUseCase', () => {
  it('sets the preferred payment method', async () => {
    const entry = FamilyDirectoryEntry.registerBillingAccount({
      id: 'acc-1',
      accountName: 'Adeyemi Family Account',
      primaryContact: 'Funmilayo Adeyemi',
      now: NOW,
    });

    await new SetAccountPreferencesUseCase(store([entry]), clock).execute({
      accountId: 'acc-1',
      preferredPaymentMethod: 'Bank Transfer',
    });

    expect(entry.preferredPaymentMethod).toBe('Bank Transfer');
  });

  it('throws when the account is missing', async () => {
    await expect(
      new SetAccountPreferencesUseCase(store(), clock).execute({
        accountId: 'missing',
        preferredPaymentMethod: 'Card',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
