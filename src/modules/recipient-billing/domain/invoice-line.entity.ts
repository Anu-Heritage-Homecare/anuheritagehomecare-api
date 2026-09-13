import { Entity } from '@shared/domain/entity.base';
import { ValidationException } from '@shared/domain/domain-exception';

interface InvoiceLineProps {
  serviceName: string;
  amountMinor: number;
}

const MAX_SERVICE_LENGTH = 120;

/**
 * One service line on an invoice (for example "Morning Care", an amount in minor
 * units). Lines both compose the invoice total and aggregate into the year to date
 * service breakdown. A child of the Invoice aggregate.
 */
export class InvoiceLine extends Entity<string> {
  private readonly props: InvoiceLineProps;

  private constructor(id: string, props: InvoiceLineProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    serviceName: string;
    amountMinor: number;
  }): InvoiceLine {
    const serviceName = params.serviceName.trim();
    if (serviceName.length === 0) {
      throw new ValidationException('An invoice line must have a service name');
    }
    if (serviceName.length > MAX_SERVICE_LENGTH) {
      throw new ValidationException('An invoice line service name exceeds the maximum length');
    }
    if (!Number.isInteger(params.amountMinor) || params.amountMinor < 0) {
      throw new ValidationException('An invoice line amount must be a non negative integer');
    }
    return new InvoiceLine(params.id, { serviceName, amountMinor: params.amountMinor });
  }

  public get serviceName(): string {
    return this.props.serviceName;
  }

  public get amountMinor(): number {
    return this.props.amountMinor;
  }
}
