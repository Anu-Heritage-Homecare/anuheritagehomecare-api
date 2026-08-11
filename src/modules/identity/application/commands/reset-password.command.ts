export interface ResetPasswordCommand {
  readonly resetToken: string;
  readonly newPassword: string;
}
