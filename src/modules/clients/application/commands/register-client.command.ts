/**
 * Application command: the validated intent to register a client. Plain data,
 * decoupled from any transport (HTTP, queue, CLI).
 */
export interface RegisterClientCommand {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string;
}
