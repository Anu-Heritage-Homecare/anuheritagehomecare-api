/**
 * Application command: the validated intent to register a family owner. Plain
 * data, decoupled from any transport.
 */
export interface RegisterFamilyOwnerCommand {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string;
  readonly addressLine1: string;
  readonly addressLine2?: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly country: string;
  readonly password: string;
}
