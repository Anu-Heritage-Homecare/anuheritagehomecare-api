import { ValidationException } from '@shared/domain/domain-exception';
import { EmailAddress } from './email-address.vo';

describe('EmailAddress', () => {
  it('normalises casing and surrounding whitespace', () => {
    const email = EmailAddress.create('  Ada.Obi@Example.COM ');
    expect(email.value).toBe('ada.obi@example.com');
  });

  it('treats two equal addresses as structurally equal', () => {
    expect(EmailAddress.create('a@b.com').equals(EmailAddress.create('A@B.com'))).toBe(true);
  });

  it.each(['', 'not-an-email', 'missing@domain', '@example.com'])(
    'rejects the invalid address "%s"',
    (invalid) => {
      expect(() => EmailAddress.create(invalid)).toThrow(ValidationException);
    },
  );
});
