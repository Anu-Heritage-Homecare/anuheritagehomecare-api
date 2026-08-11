/**
 * A generic acknowledgement. Used by flows that must not leak whether an account
 * exists (forgot password, resend) and by simple confirmations (logout).
 */
export interface MessageResult {
  message: string;
}
