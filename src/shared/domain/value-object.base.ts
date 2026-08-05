/**
 * Base class for Value Objects.
 *
 * Value Objects are immutable and compared by the structural equality of their
 * properties rather than by identity. Subclasses should validate invariants in
 * their factory/constructor and expose only readonly access to their props.
 */
export abstract class ValueObject<TProps extends object> {
  protected readonly props: Readonly<TProps>;

  protected constructor(props: TProps) {
    this.props = Object.freeze({ ...props });
  }

  public equals(other?: ValueObject<TProps>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (other.constructor !== this.constructor) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
