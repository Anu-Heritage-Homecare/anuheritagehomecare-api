/** The one time provisioning material shown when a user begins two factor setup. */
export interface TwoFactorSetupResult {
  /** The base32 secret, for manual entry into an authenticator app. */
  secret: string;
  /** The otpauth:// URI an authenticator app reads from a QR code. */
  otpauthUri: string;
}

/** The backup codes returned once, when two factor is enabled or regenerated. */
export interface TwoFactorRecoveryCodesResult {
  recoveryCodes: string[];
}
