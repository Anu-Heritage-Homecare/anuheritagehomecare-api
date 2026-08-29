import { Inject, Injectable } from '@nestjs/common';
import { PAYSLIP_REPOSITORY, PayslipRepository } from '../../domain/payslip.repository';
import { PayslipSummaryResult, toPayslipSummary } from '../dto/payslip.result';

export interface ListPayslipsQuery {
  caregiverId: string;
}

/**
 * Use case: the caregiver's payroll history, newest period first. Scoped to the
 * caregiver so they only ever see their own payslips.
 */
@Injectable()
export class ListPayslipsUseCase {
  constructor(@Inject(PAYSLIP_REPOSITORY) private readonly payslips: PayslipRepository) {}

  async execute(query: ListPayslipsQuery): Promise<PayslipSummaryResult[]> {
    const payslips = await this.payslips.listForCaregiver(query.caregiverId);
    return payslips.map((payslip) => toPayslipSummary(payslip));
  }
}
