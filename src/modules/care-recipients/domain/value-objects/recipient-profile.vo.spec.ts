import { ValidationException } from '@shared/domain/domain-exception';
import { Gender } from '../gender.enum';
import { RecipientProfile } from './recipient-profile.vo';

const base = {
  name: 'Grace Okafor',
  gender: 'FEMALE',
  dateOfBirth: new Date('1950-04-20'),
  city: 'Lagos',
  state: 'Lagos State',
  fullAddress: 'No 4 Okeowoyomi street',
  relationship: 'Parent',
  livingSituation: 'Lives with family',
};

describe('RecipientProfile', () => {
  it('creates a valid profile and trims fields', () => {
    const profile = RecipientProfile.create({ ...base, name: '  Grace Okafor  ', photoKey: '  ' });

    expect(profile.name).toBe('Grace Okafor');
    expect(profile.gender).toBe(Gender.Female);
    expect(profile.photoKey).toBeNull();
  });

  it('normalises the gender from any casing', () => {
    const profile = RecipientProfile.create({ ...base, gender: 'male' });
    expect(profile.gender).toBe(Gender.Male);
  });

  it('rejects an unknown gender', () => {
    expect(() => RecipientProfile.create({ ...base, gender: 'other' })).toThrow(
      ValidationException,
    );
  });

  it('rejects a date of birth in the future', () => {
    const future = new Date(Date.now() + 86_400_000);
    expect(() => RecipientProfile.create({ ...base, dateOfBirth: future })).toThrow(
      ValidationException,
    );
  });

  it('rejects a missing required field', () => {
    expect(() => RecipientProfile.create({ ...base, relationship: '  ' })).toThrow(
      ValidationException,
    );
  });
});
