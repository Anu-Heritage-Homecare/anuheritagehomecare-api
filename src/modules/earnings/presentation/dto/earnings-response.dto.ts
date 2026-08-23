import { ApiProperty } from '@nestjs/swagger';
import { EarningsSummaryResult } from '../../application/dto/earnings-summary.result';

class PayPeriodDto {
  @ApiProperty({ example: '2026-07-01' })
  start!: string;

  @ApiProperty({ example: '2026-07-14', description: 'Last day of the period (inclusive)' })
  end!: string;

  @ApiProperty({ example: '2026-07-15' })
  payDay!: string;

  @ApiProperty({ example: 14 })
  totalDays!: number;

  @ApiProperty({ example: 10 })
  elapsedDays!: number;

  @ApiProperty({ example: 3 })
  daysUntilPayday!: number;

  @ApiProperty({ example: 71 })
  progressPercent!: number;
}

class EarningsHoursDto {
  @ApiProperty({ example: 62, description: 'Approved (completed) hours this period' })
  approved!: number;

  @ApiProperty({ example: 8, description: 'Pending hours awaiting approval' })
  pending!: number;
}

class EarningsBreakdownDto {
  @ApiProperty({ example: 60 })
  regularHours!: number;

  @ApiProperty({ example: 29260, description: 'Regular pay in minor units' })
  regularPayMinor!: number;

  @ApiProperty({ example: 6 })
  overtimeHours!: number;

  @ApiProperty({ example: 22260 })
  overtimePayMinor!: number;

  @ApiProperty({ example: 4 })
  weekendVisits!: number;

  @ApiProperty({ example: 1960 })
  weekendBonusMinor!: number;

  @ApiProperty({ example: 53480 })
  grossMinor!: number;

  @ApiProperty({ example: 260 })
  deductionsMinor!: number;

  @ApiProperty({ example: 53220 })
  netMinor!: number;
}

/**
 * The caregiver earnings dashboard for the current pay period. All money is in
 * integer minor units of `currency`; the client formats it for display.
 */
export class EarningsResponseDto {
  @ApiProperty({ example: 'NGN' })
  currency!: string;

  @ApiProperty({ type: PayPeriodDto })
  payPeriod!: PayPeriodDto;

  @ApiProperty({ type: EarningsHoursDto })
  hours!: EarningsHoursDto;

  @ApiProperty({ example: 89000, description: 'Net from approved hours so far, in minor units' })
  estimatedPayMinor!: number;

  @ApiProperty({
    example: 196500,
    description: 'Projected net if every pending hour is approved, in minor units',
  })
  estimatedEarningsMinor!: number;

  @ApiProperty({ type: EarningsBreakdownDto })
  breakdown!: EarningsBreakdownDto;

  static fromResult(result: EarningsSummaryResult): EarningsResponseDto {
    const dto = new EarningsResponseDto();
    dto.currency = result.currency;
    dto.payPeriod = { ...result.payPeriod };
    dto.hours = { ...result.hours };
    dto.estimatedPayMinor = result.estimatedPayMinor;
    dto.estimatedEarningsMinor = result.estimatedEarningsMinor;
    dto.breakdown = { ...result.breakdown };
    return dto;
  }
}
