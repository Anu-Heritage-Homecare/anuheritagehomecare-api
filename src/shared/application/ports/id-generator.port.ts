/**
 * Abstraction over unique identifier generation. Injecting this keeps id
 * creation out of the domain and makes generated ids predictable under test.
 */
export interface IdGenerator {
  generate(): string;
}

export const ID_GENERATOR = Symbol('ID_GENERATOR');
