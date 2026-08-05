/**
 * Base class for Entities. Entities have a stable identity that persists across
 * state changes and are compared by that identity, not by their attributes.
 */
export abstract class Entity<TId> {
  protected readonly _id: TId;

  protected constructor(id: TId) {
    this._id = id;
  }

  public get id(): TId {
    return this._id;
  }

  public equals(other?: Entity<TId>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (other === this) {
      return true;
    }
    if (other.constructor !== this.constructor) {
      return false;
    }
    return this._id === other._id;
  }
}
