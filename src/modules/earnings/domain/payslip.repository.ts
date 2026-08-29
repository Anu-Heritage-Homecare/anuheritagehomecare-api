import { Payslip } from './payslip.entity';

/**
 * Persistence port for payslips. Implemented in infrastructure, bound in the
 * module. `save` is an upsert keyed on the caregiver and period start, so a
 * re-run of the same period overwrites rather than duplicates.
 */
export interface PayslipRepository {
  save(payslip: Payslip): Promise<void>;
  findById(id: string): Promise<Payslip | null>;
  listForCaregiver(caregiverId: string): Promise<Payslip[]>;
}

export const PAYSLIP_REPOSITORY = Symbol('PAYSLIP_REPOSITORY');
