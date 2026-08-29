/**
 * Port over cryptographically secure one time passcode generation. The adapter
 * (Node crypto) lives in infrastructure so randomness is never sourced from an
 * insecure generator in business logic.
 */
export interface OtpGenerator {
  generateNumeric(length: number): string;
  /**
   * A high entropy alphanumeric secret (for example a two factor recovery code),
   * drawn from an unambiguous alphabet so it is easy to read and type.
   */
  generateAlphanumeric(length: number): string;
}

export const OTP_GENERATOR = Symbol('OTP_GENERATOR');
