import { UnauthorizedDomainException } from '@shared/domain/domain-exception';
import { Country } from '../../domain/country.enum';
import { UserType } from '../../domain/user-type.enum';
import { InMemoryUserRepository } from '../../test-support/doubles';
import { buildUser } from '../../test-support/user-builder';
import { GetMyProfileUseCase } from './get-my-profile.use-case';

describe('GetMyProfileUseCase', () => {
  let users: InMemoryUserRepository;
  let useCase: GetMyProfileUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    useCase = new GetMyProfileUseCase(users);
  });

  it('returns the personal information of the authenticated user', async () => {
    await users.save(buildUser({ id: 'user-1', verified: true }));

    const profile = await useCase.execute({ userId: 'user-1' });

    expect(profile.id).toBe('user-1');
    expect(profile.firstName).toBe('Ada');
    expect(profile.lastName).toBe('Obi');
    expect(profile.email).toBe('ada.obi@example.com');
    expect(profile.phone).toBe('+2348031234567');
    expect(profile.userType).toBe(UserType.FamilyMember);
    expect(profile.isFamilyOwner).toBe(true);
    expect(profile.address).toEqual({
      line1: '12 Marina Road',
      line2: null,
      city: 'Lagos',
      state: 'Lagos',
      postalCode: '101233',
      country: Country.Nigeria,
    });
  });

  it('never leaks the password hash', async () => {
    await users.save(buildUser({ id: 'user-1', verified: true }));

    const profile = await useCase.execute({ userId: 'user-1' });

    expect(profile).not.toHaveProperty('passwordHash');
  });

  it('treats a token whose user no longer exists as unauthorized', async () => {
    await expect(useCase.execute({ userId: 'ghost' })).rejects.toBeInstanceOf(
      UnauthorizedDomainException,
    );
  });
});
