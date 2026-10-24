/**
 * Application command: the validated intent to register a mobile account. Shared
 * by the family owner self signup and the invited care circle member signup; the
 * only difference between them is the `isFamilyOwner` flag. Plain data, decoupled
 * from any transport.
 */
export interface RegisterAccountCommand {
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
  /** True for a family owner self signup; false for an invited care circle member. */
  readonly isFamilyOwner: boolean;
}
