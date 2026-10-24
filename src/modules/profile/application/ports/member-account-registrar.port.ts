/**
 * Port the care circle register and link flow uses to create a brand new mobile
 * account for an invited member. The concrete adapter delegates to the identity
 * context, so profile depends only on this abstraction and never on identity's
 * internals. Registering a member creates a non owner account; on a duplicate
 * email the adapter throws AccountAlreadyExistsException (ACCOUNT_EXISTS).
 */
export interface MemberRegistrationDetails {
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

export interface MemberRegistrationOutcome {
  readonly userId: string;
  readonly emailVerificationRequired: boolean;
}

export interface MemberAccountRegistrar {
  register(details: MemberRegistrationDetails): Promise<MemberRegistrationOutcome>;
}

export const MEMBER_ACCOUNT_REGISTRAR = Symbol('MEMBER_ACCOUNT_REGISTRAR');
