/**
 * Command to change the password of the currently authenticated user. The user
 * id comes from the verified access token, never from the request body.
 */
export interface ChangePasswordCommand {
  readonly userId: string;
  readonly currentPassword: string;
  readonly newPassword: string;
}
