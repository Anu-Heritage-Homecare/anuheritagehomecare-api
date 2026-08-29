import { ConfigService } from '@nestjs/config';
import { TotpAuthenticator } from './totp-authenticator';

// RFC 6238 reference secret ("12345678901234567890" in ASCII) as base32. At Unix
// time 59s the SHA1 TOTP is 94287082; truncated to 6 digits that is 287082.
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
const AT_59_SECONDS = new Date(59 * 1000);

function build(): TotpAuthenticator {
  const config = {
    getOrThrow: () => ({ issuer: 'Anu Heritage Homecare', encryptionKey: 'x' }),
  } as unknown as ConfigService;
  return new TotpAuthenticator(config);
}

describe('TotpAuthenticator', () => {
  it('accepts the RFC 6238 reference code for the current step', () => {
    const authenticator = build();
    expect(authenticator.verify({ secret: RFC_SECRET, code: '287082', now: AT_59_SECONDS })).toBe(
      true,
    );
  });

  it('rejects a wrong code', () => {
    const authenticator = build();
    expect(authenticator.verify({ secret: RFC_SECRET, code: '000000', now: AT_59_SECONDS })).toBe(
      false,
    );
  });

  it('rejects a non numeric or wrong length code', () => {
    const authenticator = build();
    expect(authenticator.verify({ secret: RFC_SECRET, code: 'abcdef', now: AT_59_SECONDS })).toBe(
      false,
    );
    expect(authenticator.verify({ secret: RFC_SECRET, code: '12345', now: AT_59_SECONDS })).toBe(
      false,
    );
  });

  it('tolerates one step of clock drift but no more', () => {
    const authenticator = build();
    // 287082 is the code for step 1 (t=59); it stays valid one step later (t=89)
    // but not two steps later (t=119).
    expect(
      authenticator.verify({ secret: RFC_SECRET, code: '287082', now: new Date(89_000) }),
    ).toBe(true);
    expect(
      authenticator.verify({ secret: RFC_SECRET, code: '287082', now: new Date(119_000) }),
    ).toBe(false);
  });

  it('generates a base32 secret and a well formed otpauth URI', () => {
    const authenticator = build();
    const secret = authenticator.generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(32);

    const uri = authenticator.keyUri(secret, 'ada.obi@example.com');
    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain(`secret=${secret}`);
    expect(uri).toContain('issuer=Anu+Heritage+Homecare');
  });
});
