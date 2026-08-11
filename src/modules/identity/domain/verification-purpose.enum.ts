/**
 * Why a one time passcode was issued. Codes are scoped to a single purpose so an
 * email verification code can never be replayed to reset a password.
 */
export enum VerificationPurpose {
  EmailVerification = 'EMAIL_VERIFICATION',
  PasswordReset = 'PASSWORD_RESET',
}
