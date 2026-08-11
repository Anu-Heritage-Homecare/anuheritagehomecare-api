import { ValidationException } from '@shared/domain/domain-exception';
import { Country } from '../country.enum';
import { PhoneNumber } from './phone-number.vo';

describe('PhoneNumber', () => {
  describe('United States', () => {
    it.each([
      ['+14155552671', '+14155552671'],
      ['14155552671', '+14155552671'],
      ['4155552671', '+14155552671'],
      ['(415) 555-2671', '+14155552671'],
    ])('normalises %s to %s', (input, expected) => {
      const phone = PhoneNumber.create(input);
      expect(phone.value).toBe(expected);
      expect(phone.country).toBe(Country.UnitedStates);
    });

    it('rejects a number whose area code starts with 1', () => {
      expect(() => PhoneNumber.create('1155552671')).toThrow(ValidationException);
    });
  });

  describe('Nigeria', () => {
    it.each([
      ['+2348031234567', '+2348031234567'],
      ['08031234567', '+2348031234567'],
      ['+234 803 123 4567', '+2348031234567'],
    ])('normalises %s to %s', (input, expected) => {
      const phone = PhoneNumber.create(input);
      expect(phone.value).toBe(expected);
      expect(phone.country).toBe(Country.Nigeria);
    });

    it('rejects a Nigeria number whose national prefix is not mobile', () => {
      // National significant number starting with 1 is not an accepted mobile prefix.
      expect(() => PhoneNumber.create('08131234567')).not.toThrow();
      expect(() => PhoneNumber.create('01234567890')).toThrow(ValidationException);
    });
  });

  describe('other countries', () => {
    it.each(['+447911123456', '+33612345678', '+861391234567'])('rejects %s', (input) => {
      expect(() => PhoneNumber.create(input)).toThrow(ValidationException);
    });
  });

  it('rejects an empty value', () => {
    expect(() => PhoneNumber.create('   ')).toThrow(ValidationException);
  });

  it('rejects non numeric junk', () => {
    expect(() => PhoneNumber.create('not-a-phone')).toThrow(ValidationException);
  });
});
