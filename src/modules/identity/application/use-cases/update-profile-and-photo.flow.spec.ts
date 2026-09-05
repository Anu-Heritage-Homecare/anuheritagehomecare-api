import { PhotoStorage } from '@shared/application/ports/photo-storage.port';
import { UnauthorizedDomainException } from '@shared/domain/domain-exception';
import { InMemoryUserRepository, fixedClock, sequentialIds } from '../../test-support/doubles';
import { buildUser } from '../../test-support/user-builder';
import { CreateProfilePhotoTicketUseCase } from './create-profile-photo-ticket.use-case';
import { SetProfilePhotoUseCase } from './set-profile-photo.use-case';
import { UpdateMyProfileUseCase } from './update-my-profile.use-case';

const photos: PhotoStorage = {
  createUploadTicket: ({ reference }) => ({
    uploadUrl: 'https://upload',
    fields: { key: reference },
    key: reference,
  }),
  urlFor: (key) => (key.length === 0 ? '' : `https://cdn/${key}`),
  download: () => Promise.resolve(Buffer.from('')),
};

const profileInput = {
  firstName: 'Andy',
  lastName: 'Pratama',
  phone: '+2348012345678',
  addressLine1: '9 Broad Street',
  city: 'Lagos',
  state: 'Lagos',
  postalCode: '101233',
  country: 'NG',
  dateOfBirth: '1990-03-15',
  relationshipToRecipient: 'Son',
};

describe('profile edit and photo', () => {
  let users: InMemoryUserRepository;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    await users.save(buildUser({ id: 'user-1', verified: true }));
  });

  it('updates the editable personal information', async () => {
    const result = await new UpdateMyProfileUseCase(users, photos, fixedClock).execute({
      userId: 'user-1',
      ...profileInput,
    });

    expect(result.firstName).toBe('Andy');
    expect(result.lastName).toBe('Pratama');
    expect(result.phone).toBe('+2348012345678');
    expect(result.address.line1).toBe('9 Broad Street');
    expect(result.dateOfBirth).toBe('1990-03-15');
    expect(result.relationshipToRecipient).toBe('Son');
  });

  it('issues an upload ticket namespaced to the user', () => {
    const ticket = new CreateProfilePhotoTicketUseCase(
      photos,
      sequentialIds('t'),
      fixedClock,
    ).execute({
      userId: 'user-1',
    });
    expect(ticket.key).toBe('avatars/user-1/t-1');
  });

  it('sets and then clears the profile photo, resolving the avatar url', async () => {
    const setPhoto = new SetProfilePhotoUseCase(users, photos, fixedClock);

    const withPhoto = await setPhoto.execute({ userId: 'user-1', photoKey: 'avatars/user-1/a' });
    expect(withPhoto.photoUrl).toBe('https://cdn/avatars/user-1/a');

    const cleared = await setPhoto.execute({ userId: 'user-1', photoKey: null });
    expect(cleared.photoUrl).toBeNull();
  });

  it('rejects an unknown user', async () => {
    await expect(
      new UpdateMyProfileUseCase(users, photos, fixedClock).execute({
        userId: 'ghost',
        ...profileInput,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedDomainException);
  });
});
