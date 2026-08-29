import { ApiProperty } from '@nestjs/swagger';
import { PayslipDetailResult, PayslipSummaryResult } from '../../application/dto/payslip.result';

/** One payslip in the caregiver's payroll history. */
export class PayslipSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'NGN' })
  currency!: string;

  @ApiProperty({ example: '2026-06-17' })
  periodStart!: string;

  @ApiProperty({ example: '2026-06-30' })
  periodEnd!: string;

  @ApiProperty({ example: '2026-07-01' })
  payDay!: string;

  @ApiProperty({ example: 19650000, description: 'Net pay in integer minor units' })
  netMinor!: number;

  static fromResult(result: PayslipSummaryResult): PayslipSummaryResponseDto {
    return Object.assign(new PayslipSummaryResponseDto(), result);
  }
}

class PayslipBreakdownDto {
  @ApiProperty({ example: 40 })
  regularHours!: number;

  @ApiProperty({ example: 2926000 })
  regularPayMinor!: number;

  @ApiProperty({ example: 6 })
  overtimeHours!: number;

  @ApiProperty({ example: 2226000 })
  overtimePayMinor!: number;

  @ApiProperty({ example: 4 })
  weekendVisits!: number;

  @ApiProperty({ example: 196000 })
  weekendBonusMinor!: number;

  @ApiProperty({ example: 5348000 })
  grossMinor!: number;

  @ApiProperty({ example: 26000 })
  deductionsMinor!: number;

  @ApiProperty({ example: 5322000 })
  netMinor!: number;
}

/** The full detail behind one payslip. */
export class PayslipDetailResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'NGN' })
  currency!: string;

  @ApiProperty({ example: '2026-06-17' })
  periodStart!: string;

  @ApiProperty({ example: '2026-06-30' })
  periodEnd!: string;

  @ApiProperty({ example: '2026-07-01' })
  payDay!: string;

  @ApiProperty({ example: 46 })
  workedHours!: number;

  @ApiProperty({ type: PayslipBreakdownDto })
  breakdown!: PayslipBreakdownDto;

  static fromResult(result: PayslipDetailResult): PayslipDetailResponseDto {
    const dto = new PayslipDetailResponseDto();
    dto.id = result.id;
    dto.currency = result.currency;
    dto.periodStart = result.periodStart;
    dto.periodEnd = result.periodEnd;
    dto.payDay = result.payDay;
    dto.workedHours = result.workedHours;
    dto.breakdown = { ...result.breakdown };
    return dto;
  }
}
