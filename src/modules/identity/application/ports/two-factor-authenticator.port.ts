/**
 * Port over TOTP (RFC 6238) authenticator support. The adapter lives in
 * infrastructure and uses Node crypto, so no time based one time password logic
 * or randomness is sourced in the application or domain layers.
 */
export interface TwoFactorAuthenticator {
  /** Generate a fresh base32 encoded shared secret for a new enrolment. */
  generateSecret(): string;

  /**
   * Build the otpauth:// URI an authenticator app encodes as a QR code, labelled
   * with the issuer and the given account name (the user's email).
   */
  keyUri(secret: string, accountName: string): string;

  /**
   * Whether the code is valid for the secret at the given time, allowing a small
   * window either side for clock drift between the server and the device.
   */
  verify(params: { secret: string; code: string; now: Date }): boolean;
}

export const TWO_FACTOR_AUTHENTICATOR = Symbol('TWO_FACTOR_AUTHENTICATOR');
