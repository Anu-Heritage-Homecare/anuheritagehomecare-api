import { FamilyDirectoryEntry } from '@modules/family-directory/domain/family-directory-entry.entity';
import { FamilyDirectoryEntryRepository } from '@modules/family-directory/domain/family-directory-entry.repository';
import { FamilyMemberStatus } from '@modules/family-directory/domain/family-member-status.enum';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AddFamilyUseCase, ImportFamiliesUseCase } from './add-family.use-case';
import { BulkEditFamiliesUseCase } from './bulk-edit-families.use-case';
import { EditFamilyUseCase } from './edit-family.use-case';

const NOW = new Date('2026-09-20T10:00:00.000Z');
const clock = { now: () => NOW };

let counter = 0;
const ids = { generate: () => `fam-${(counter += 1)}` };

function store(initial: FamilyDirectoryEntry[] = []): FamilyDirectoryEntryRepository & {
  items: FamilyDirectoryEntry[];
} {
  const items = [...initial];
  return {
    items,
    save: (entry) => {
      if (!items.includes(entry)) {
        items.push(entry);
      }
      return Promise.resolve();
    },
    saveMany: (entries) => {
      items.push(...entries);
      return Promise.resolve();
    },
    findById: (id) => Promise.resolve(items.find((e) => e.id === id) ?? null),
    findByUserId: () => Promise.resolve(null),
    findByIds: (wanted) => Promise.resolve(items.filter((e) => wanted.includes(e.id))),
  };
}

function contact(id: string): FamilyDirectoryEntry {
  return FamilyDirectoryEntry.registerContact({ id, fullName: 'David Johnson', now: NOW });
}

describe('AddFamilyUseCase', () => {
  it('adds a contact entry and returns its id', async () => {
    counter = 0;
    const repo = store();
    const result = await new AddFamilyUseCase(repo, ids, clock).execute({
      fullName: 'Sarah Johnson',
      phone: '(555) 123-4568',
    });
    expect(result.id).toBe('fam-1');
    expect(repo.items).toHaveLength(1);
  });
});

describe('ImportFamiliesUseCase', () => {
  it('bulk creates contact entries', async () => {
    counter = 0;
    const repo = store();
    const result = await new ImportFamiliesUseCase(repo, ids, clock).execute([
      { fullName: 'A' },
      { fullName: 'B' },
    ]);
    expect(result.created).toBe(2);
    expect(repo.items).toHaveLength(2);
  });
});

describe('EditFamilyUseCase', () => {
  it('sets the quick notes on an entry', async () => {
    const entry = contact('fam-1');
    await new EditFamilyUseCase(store([entry]), clock).execute({
      entryId: 'fam-1',
      section: 'NOTES',
      quickNotes: 'Prefers phone.',
    });
    expect(entry.quickNotes).toBe('Prefers phone.');
  });

  it('rejects an unknown entry', async () => {
    await expect(
      new EditFamilyUseCase(store(), clock).execute({
        entryId: 'nope',
        section: 'EMERGENCY_VERIFIED',
        verified: true,
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('BulkEditFamiliesUseCase', () => {
  it('bulk sets status and reports missing ids', async () => {
    const a = contact('fam-1');
    const b = contact('fam-2');
    const result = await new BulkEditFamiliesUseCase(store([a, b]), clock).execute({
      ids: ['fam-1', 'fam-2', 'missing'],
      status: FamilyMemberStatus.Inactive,
    });
    expect(result.updated).toBe(2);
    expect(result.notFound).toEqual(['missing']);
    expect(a.status).toBe(FamilyMemberStatus.Inactive);
  });
});
