import { CoverageBlock } from './coverage-block.entity';

/**
 * Persistence port for a recipient's weekly coverage grid. Captured as a set, so
 * the write replaces the blocks wholesale; reads return them all.
 */
export interface CoverageBlockRepository {
  replaceForRecipient(careRecipientId: string, blocks: CoverageBlock[]): Promise<void>;
  listForRecipient(careRecipientId: string): Promise<CoverageBlock[]>;
}

export const COVERAGE_BLOCK_REPOSITORY = Symbol('COVERAGE_BLOCK_REPOSITORY');
