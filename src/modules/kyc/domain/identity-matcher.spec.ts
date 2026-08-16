import { compareIdentity } from './identity-matcher';

describe('compareIdentity', () => {
  const claimed = {
    firstName: 'Chidi',
    lastName: 'Eze',
    dateOfBirth: new Date('1990-04-20'),
  };

  it('returns no mismatches when everything matches', () => {
    expect(
      compareIdentity(claimed, {
        firstName: 'Chidi',
        lastName: 'Eze',
        dateOfBirth: new Date('1990-04-20'),
      }),
    ).toEqual([]);
  });

  it('ignores case, surrounding space and accents on names', () => {
    expect(
      compareIdentity(claimed, {
        firstName: '  chidi ',
        lastName: 'EZE',
        dateOfBirth: new Date('1990-04-20T09:00:00.000Z'),
      }),
    ).toEqual([]);
  });

  it('flags each field that differs', () => {
    const mismatches = compareIdentity(claimed, {
      firstName: 'Chidi',
      lastName: 'Okafor',
      dateOfBirth: new Date('1991-04-20'),
    });
    expect(mismatches.map((m) => m.field)).toEqual(['lastName', 'dateOfBirth']);
  });

  it('does not flag fields the provider did not return', () => {
    expect(compareIdentity(claimed, { firstName: 'Chidi' })).toEqual([]);
  });
});
