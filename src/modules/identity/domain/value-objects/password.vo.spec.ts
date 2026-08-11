import { ValidationException } from '@shared/domain/domain-exception';
import { Password } from './password.vo';

describe('Password', () => {
  it('accepts a password that meets the policy', () => {
    const password = Password.create('S3curePass');
    expect(password.value).toBe('S3curePass');
  });

  it.each([
    ['too short', 'Ab1'],
    ['no digit', 'SecurePass'],
    ['no uppercase', 'securepass1'],
    ['no lowercase', 'SECUREPASS1'],
    ['empty', ''],
  ])('rejects a password with %s', (_label, value) => {
    expect(() => Password.create(value)).toThrow(ValidationException);
  });
});
