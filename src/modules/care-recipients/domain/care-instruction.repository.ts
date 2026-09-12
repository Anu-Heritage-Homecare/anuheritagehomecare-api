import { CareInstruction } from './care-instruction.entity';

/**
 * Persistence port for a recipient's care instructions (medical needs and
 * behavioral notes). Captured as a set, so the write replaces them wholesale.
 */
export interface CareInstructionRepository {
  replaceForRecipient(careRecipientId: string, instructions: CareInstruction[]): Promise<void>;
  listForRecipient(careRecipientId: string): Promise<CareInstruction[]>;
}

export const CARE_INSTRUCTION_REPOSITORY = Symbol('CARE_INSTRUCTION_REPOSITORY');
