/** Outcome of a successful registration. No tokens are issued until the email is verified. */
export interface RegistrationResult {
  userId: string;
  email: string;
  emailVerificationRequired: true;
}
