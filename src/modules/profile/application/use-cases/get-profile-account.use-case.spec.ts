import { PhotoStorage } from '@shared/application/ports/photo-storage.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  ProfilePlanDirectory,
  ProfileUser,
  ProfileUserDirectory,
} from '../ports/profile-directories.port';
import { GetProfileAccountUseCase } from './get-profile-account.use-case';

function users(user: ProfileUser | null): ProfileUserDirectory {
  return {
    findById: () => Promise.resolve(user),
    findByIds: () => Promise.resolve(user === null ? [] : [user]),
  };
}

function plans(name: string | null): ProfilePlanDirectory {
  return { activePlanNameForOwner: () => Promise.resolve(name) };
}

const photos: PhotoStorage = {
  createUploadTicket: () => ({ uploadUrl: '', fields: {}, key: '' }),
  urlFor: (key) => (key === 'owner/photo' ? 'https://cdn/owner/photo' : ''),
  download: () => Promise.resolve(Buffer.from('')),
};

const owner: ProfileUser = {
  id: 'owner-1',
  firstName: 'Andy',
  lastName: 'Pratama',
  email: 'andy@example.com',
  userType: 'FAMILY_MEMBER',
  isFamilyOwner: true,
  photoKey: 'owner/photo',
};

describe('GetProfileAccountUseCase', () => {
  it('composes name, role, plan badge and avatar for a family owner', async () => {
    const useCase = new GetProfileAccountUseCase(users(owner), plans('Premium Home Care'), photos);

    const result = await useCase.execute({ userId: 'owner-1' });

    expect(result).toEqual({
      name: 'Andy Pratama',
      role: 'Primary Family Member',
      planName: 'Premium Home Care',
      photoUrl: 'https://cdn/owner/photo',
    });
  });

  it('returns null plan and photo when there is no active plan or no avatar', async () => {
    const useCase = new GetProfileAccountUseCase(
      users({ ...owner, photoKey: null }),
      plans(null),
      photos,
    );

    const result = await useCase.execute({ userId: 'owner-1' });

    expect(result.planName).toBeNull();
    expect(result.photoUrl).toBeNull();
  });

  it('labels a caregiver and a non owner family member', async () => {
    const caregiver = await new GetProfileAccountUseCase(
      users({ ...owner, userType: 'CAREGIVER', isFamilyOwner: false }),
      plans(null),
      photos,
    ).execute({ userId: 'cg-1' });
    expect(caregiver.role).toBe('Caregiver');

    const member = await new GetProfileAccountUseCase(
      users({ ...owner, isFamilyOwner: false }),
      plans(null),
      photos,
    ).execute({ userId: 'm-1' });
    expect(member.role).toBe('Family Member');
  });

  it('404s an unknown user', async () => {
    const useCase = new GetProfileAccountUseCase(users(null), plans(null), photos);
    await expect(useCase.execute({ userId: 'nope' })).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });
});
