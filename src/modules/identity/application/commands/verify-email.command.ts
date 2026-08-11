export interface VerifyEmailCommand {
  readonly email: string;
  readonly code: string;
}
