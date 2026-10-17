import { Clock } from '@shared/application/ports/clock.port';
import { PhotoStorage } from '@shared/application/ports/photo-storage.port';
import { ValidationException } from '@shared/domain/domain-exception';
import { CareCode, CareCodeStatus } from '../../domain/care-code.entity';
import { CareCodeRepository } from '../../domain/care-code.repository';
import { ProfileUser, ProfileUserDirectory } from '../ports/profile-directories.port';
import { PreviewCareCodeUseCase } from './care-circle.use-cases';

const NOW = new Date('2026-09-05T00:00:00.000Z');
const clock: Clock = { now: () => NOW };

const photos: PhotoStorage = {
  createUploadTicket: () => ({ uploadUrl: '', fields: {}, key: '' }),
  urlFor: (key) => (key.length === 0 ? '' : `https://cdn/${key}`),
  download: () => Promise.resolve(Buffer.from('')),
};

function user(over: Partial<ProfileUser> & { id: string }): ProfileUser {
  return {
    firstName: 'First',
    lastName: 'Last',
    email: `${over.id}@example.com`,
    userType: 'FAMILY_MEMBER',
    isFamilyOwner: false,
    photoKey: null,
    ...over,
  };
}

function userDirectory(users: ProfileUser[]): ProfileUserDirectory {
  const byId = new Map(users.map((u) => [u.id, u]));
  return {
    findById: (id) => Promise.resolve(byId.get(id) ?? null),
    findByIds: (ids) =>
      Promise.resolve(
        ids.map((id) => byId.get(id)).filter((u): u is ProfileUser => u !== undefined),
      ),
  };
}

class InMemoryCareCodeRepository implements CareCodeRepository {
  public store = new Map<string, CareCode>();
  save(code: CareCode): Promise<void> {
    this.store.set(code.id, code);
    return Promise.resolve();
  }
  findById(id: string): Promise<CareCode | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }
  findByCode(code: string): Promise<CareCode | null> {
    return Promise.resolve([...this.store.values()].find((c) => c.code === code) ?? null);
  }
  findActiveForOwner(ownerId: string): Promise<CareCode | null> {
    return Promise.resolve(
      [...this.store.values()].find(
        (c) => c.ownerId === ownerId && c.status === CareCodeStatus.Active,
      ) ?? null,
    );
  }
}

describe('PreviewCareCodeUseCase', () => {
  let codes: InMemoryCareCodeRepository;

  beforeEach(async () => {
    codes = new InMemoryCareCodeRepository();
    await codes.save(
      CareCode.issue({ id: 'c1', ownerId: 'owner-1', code: 'CARE-7319-KLM2', now: NOW }),
    );
  });

  it('returns the owner name and avatar for a valid code, regardless of case/spacing', async () => {
    const users = userDirectory([
      user({ id: 'owner-1', firstName: 'Joseph', lastName: 'Simon', photoKey: 'avatars/o1/p' }),
    ]);

    const result = await new PreviewCareCodeUseCase(codes, users, photos, clock).execute({
      code: '  care-7319-klm2  ',
    });

    expect(result).toEqual({
      ownerName: 'Joseph Simon',
      ownerPhotoUrl: 'https://cdn/avatars/o1/p',
    });
  });

  it('returns a null avatar when the owner has no photo', async () => {
    const users = userDirectory([user({ id: 'owner-1', firstName: 'Jo', lastName: 'Simon' })]);
    const result = await new PreviewCareCodeUseCase(codes, users, photos, clock).execute({
      code: 'CARE-7319-KLM2',
    });
    expect(result.ownerPhotoUrl).toBeNull();
  });

  it('rejects an unknown or expired code with the same error', async () => {
    const users = userDirectory([user({ id: 'owner-1' })]);
    const preview = new PreviewCareCodeUseCase(codes, users, photos, clock);

    await expect(preview.execute({ code: 'CARE-0000-ZZZZ' })).rejects.toBeInstanceOf(
      ValidationException,
    );

    const later = new PreviewCareCodeUseCase(codes, users, photos, {
      now: () => new Date('2026-09-20T00:00:00.000Z'),
    });
    await expect(later.execute({ code: 'CARE-7319-KLM2' })).rejects.toBeInstanceOf(
      ValidationException,
    );
  });
});
