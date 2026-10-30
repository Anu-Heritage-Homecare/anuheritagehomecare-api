import { AdminRole } from '@modules/admin-identity/domain/admin-role.enum';
import { AdminUser } from '@modules/admin-identity/domain/admin-user.entity';
import { AdminUserRepository } from '@modules/admin-identity/domain/admin-user.repository';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { VisitNoteSource } from '@modules/visits/domain/value-objects/visit-note-source.enum';
import {
  InMemoryVisitRepository,
  buildVisit,
  fixedClock,
  sequentialIds,
} from '@modules/visits/test-support/doubles';
import {
  AcknowledgeVisitNoteUseCase,
  AddCoordinatorNoteUseCase,
  EditVisitNoteUseCase,
  FlagVisitNoteUseCase,
  ReplyToVisitNoteUseCase,
} from './manage-visit-notes.use-case';

const admins: AdminUserRepository = {
  findById: () =>
    Promise.resolve({
      name: { firstName: 'Adaeze', lastName: 'Nnamdi' },
      role: AdminRole.Coordinator,
    } as unknown as AdminUser),
  findByEmail: () => Promise.resolve(null),
  save: () => Promise.resolve(),
};

async function withNote(): Promise<{ visits: InMemoryVisitRepository; noteId: string }> {
  const visits = new InMemoryVisitRepository();
  await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));
  const ids = sequentialIds('note');
  const { id } = await new AddCoordinatorNoteUseCase(visits, admins, ids, fixedClock).execute({
    visitId: 'v1',
    adminId: 'admin-1',
    text: 'Confirmed with family evening medication restocked.',
  });
  return { visits, noteId: id };
}

describe('visit note coordinator operations', () => {
  it('adds a coordinator note with the author snapshotted', async () => {
    const { visits, noteId } = await withNote();
    const note = visits.store.get('v1')?.notes.find((n) => n.id === noteId);
    expect(note?.source).toBe(VisitNoteSource.Coordinator);
    expect(note?.authorName).toBe('Adaeze Nnamdi');
    expect(note?.authorRole).toBe('Coordinator');
    expect(note?.authorAdminId).toBe('admin-1');
  });

  it('acknowledges, flags, edits and replies to a note', async () => {
    const { visits, noteId } = await withNote();
    const ids = sequentialIds('reply');

    await new AcknowledgeVisitNoteUseCase(visits, admins, ids, fixedClock).execute({
      visitId: 'v1',
      noteId,
      adminId: 'admin-1',
    });
    await new FlagVisitNoteUseCase(visits, admins, ids, fixedClock).execute({
      visitId: 'v1',
      noteId,
    });
    await new EditVisitNoteUseCase(visits, admins, ids, fixedClock).execute({
      visitId: 'v1',
      noteId,
      text: 'Updated note.',
    });
    await new ReplyToVisitNoteUseCase(visits, admins, ids, fixedClock).execute({
      visitId: 'v1',
      noteId,
      adminId: 'admin-1',
      text: 'Noted, thank you.',
    });

    const note = visits.store.get('v1')?.notes.find((n) => n.id === noteId);
    expect(note?.acknowledgedByName).toBe('Adaeze Nnamdi');
    expect(note?.flaggedForCoordinator).toBe(true);
    expect(note?.text).toBe('Updated note.');
    expect(note?.editedAt).not.toBeNull();
    expect(note?.replies).toHaveLength(1);
    expect(note?.replies[0].text).toBe('Noted, thank you.');
  });
});
