export interface VerifyPasswordResetOtpCommand {
  readonly email: string;
  readonly code: string;
}
