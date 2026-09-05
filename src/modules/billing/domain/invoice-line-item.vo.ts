import { ValidationException } from '@shared/domain/domain-exception';
import { ValueObject } from '@shared/domain/value-object.base';

interface InvoiceLineItemProps {
  description: string;
  amountMinor: number;
}

const MAX_DESCRIPTION_LENGTH = 200;

/**
 * One line on an invoice: a service or charge with its amount in integer minor
 * units. Captured at issue time and never changed, so the invoice stays a true
 * record of what was billed.
 */
export class InvoiceLineItem extends ValueObject<InvoiceLineItemProps> {
  private constructor(props: InvoiceLineItemProps) {
    super(props);
  }

  public static create(input: { description: string; amountMinor: number }): InvoiceLineItem {
    const description = input.description.trim();
    if (description.length === 0) {
      throw new ValidationException('An invoice line needs a description');
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      throw new ValidationException('An invoice line description is too long');
    }
    if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0) {
      throw new ValidationException('An invoice line amount must be a non negative whole number');
    }
    return new InvoiceLineItem({ description, amountMinor: input.amountMinor });
  }

  public get description(): string {
    return this.props.description;
  }

  public get amountMinor(): number {
    return this.props.amountMinor;
  }
}
