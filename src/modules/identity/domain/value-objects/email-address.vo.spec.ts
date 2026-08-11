import { ValidationException } from '@shared/domain/domain-exception';
import { EmailAddress } from './email-address.vo';

describe('EmailAddress', () => {
  it('trims and lowercases the address', () => {
    const email = EmailAddress.create('  Ada.Obi@Example.COM ');
    expect(email.value).toBe('ada.obi@example.com');
  });

  it.each(['', 'not-an-email', 'missing@domain', '@example.com', 'a b@example.com'])(
    'rejects %s',
    (value) => {
      expect(() => EmailAddress.create(value)).toThrow(ValidationException);
    },
  );
});
