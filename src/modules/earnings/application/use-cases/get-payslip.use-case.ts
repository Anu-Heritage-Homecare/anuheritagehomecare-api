import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { PAYSLIP_REPOSITORY, PayslipRepository } from '../../domain/payslip.repository';
import { PayslipDetailResult, toPayslipDetail } from '../dto/payslip.result';

export interface GetPayslipQuery {
  caregiverId: string;
  payslipId: string;
}

/**
 * Use case: a single payslip's full detail. A payslip that does not exist or
 * belongs to another caregiver is reported as not found, so the endpoint never
 * discloses another caregiver's pay.
 */
@Injectable()
export class GetPayslipUseCase {
  constructor(@Inject(PAYSLIP_REPOSITORY) private readonly payslips: PayslipRepository) {}

  async execute(query: GetPayslipQuery): Promise<PayslipDetailResult> {
    const payslip = await this.payslips.findById(query.payslipId);
    if (payslip === null || payslip.caregiverId !== query.caregiverId) {
      throw new NotFoundDomainException('Payslip not found');
    }
    return toPayslipDetail(payslip);
  }
}
