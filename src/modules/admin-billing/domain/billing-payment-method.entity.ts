import { ValidationException } from '@shared/domain/domain-exception';
import {
  BillingPaymentMethodKind,
  DEFAULT_PAYMENT_METHOD_DESCRIPTION,
} from './billing-payment-method-kind.enum';

const MAX_DESCRIPTION = 200;

/** One configurable payment avenue: whether it is offered and its short description. */
export class BillingPaymentMethodSetting {
  private constructor(
    readonly method: BillingPaymentMethodKind,
    private _enabled: boolean,
    private _description: string,
  ) {}

  static createDefault(method: BillingPaymentMethodKind): BillingPaymentMethodSetting {
    return new BillingPaymentMethodSetting(
      method,
      true,
      DEFAULT_PAYMENT_METHOD_DESCRIPTION[method],
    );
  }

  static fromPersistence(
    method: BillingPaymentMethodKind,
    enabled: boolean,
    description: string,
  ): BillingPaymentMethodSetting {
    return new BillingPaymentMethodSetting(method, enabled, description);
  }

  /** Update whether the avenue is offered and/or its description; omitted fields unchanged. */
  apply(patch: { enabled?: boolean; description?: string }): this {
    if (patch.enabled !== undefined) {
      this._enabled = patch.enabled;
    }
    if (patch.description !== undefined) {
      const description = patch.description.trim();
      if (description.length === 0 || description.length > MAX_DESCRIPTION) {
        throw new ValidationException(
          `A payment method description must be 1 to ${MAX_DESCRIPTION} characters`,
        );
      }
      this._description = description;
    }
    return this;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  get description(): string {
    return this._description;
  }
}
