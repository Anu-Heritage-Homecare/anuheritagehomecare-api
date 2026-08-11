/**
 * Base class for domain and application errors.
 *
 * The domain layer must stay free of framework concerns, so these exceptions
 * carry a transport agnostic `code` and a semantic `kind`. The HTTP layer
 * (see DomainExceptionFilter) maps `kind` to the correct status code, keeping
 * HTTP details out of the domain.
 */
export type DomainExceptionKind =
  'VALIDATION' | 'NOT_FOUND' | 'CONFLICT' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'UNPROCESSABLE';

export abstract class DomainException extends Error {
  public abstract readonly code: string;
  public abstract readonly kind: DomainExceptionKind;

  protected constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationException extends DomainException {
  public readonly code = 'VALIDATION_ERROR';
  public readonly kind: DomainExceptionKind = 'VALIDATION';

  constructor(message: string) {
    super(message);
  }
}

export class NotFoundDomainException extends DomainException {
  public readonly code = 'NOT_FOUND';
  public readonly kind: DomainExceptionKind = 'NOT_FOUND';

  constructor(message: string) {
    super(message);
  }
}

export class ConflictDomainException extends DomainException {
  public readonly code = 'CONFLICT';
  public readonly kind: DomainExceptionKind = 'CONFLICT';

  constructor(message: string) {
    super(message);
  }
}

export class UnauthorizedDomainException extends DomainException {
  public readonly code = 'INVALID_CREDENTIALS';
  public readonly kind: DomainExceptionKind = 'UNAUTHORIZED';

  constructor(message = 'Invalid credentials') {
    super(message);
  }
}

export class ForbiddenDomainException extends DomainException {
  public readonly code = 'FORBIDDEN';
  public readonly kind: DomainExceptionKind = 'FORBIDDEN';

  constructor(message: string) {
    super(message);
  }
}

/**
 * Raised when authentication succeeds but the account has not verified its
 * email. Carries a distinct `code` so the mobile client can route the user to
 * the email verification screen rather than treating it as a generic failure.
 */
export class EmailNotVerifiedException extends DomainException {
  public readonly code = 'EMAIL_NOT_VERIFIED';
  public readonly kind: DomainExceptionKind = 'FORBIDDEN';

  constructor(message = 'Email address has not been verified') {
    super(message);
  }
}
