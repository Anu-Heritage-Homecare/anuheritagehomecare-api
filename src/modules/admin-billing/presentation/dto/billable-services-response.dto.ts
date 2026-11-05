import { ApiProperty } from '@nestjs/swagger';
import {
  BillableServiceResult,
  BillableServicesResult,
} from '../../application/dto/billable-services.result';

class BillableServiceDto implements BillableServiceResult {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'PERSONAL_CARE_SUPPORT' }) code!: string;
  @ApiProperty({ example: 'Personal Care Support' }) name!: string;
  @ApiProperty({ example: 'Hourly Care Plan Support Tasks' }) description!: string;
  @ApiProperty({ enum: ['HOURLY', 'SESSION', 'FIXED'] }) unit!: 'HOURLY' | 'SESSION' | 'FIXED';
  @ApiProperty({ nullable: true, type: Number, example: 1_500_000 }) rateMinor!: number | null;
}

/** The billable services catalog for one market (Create Invoice wizard, step 3). */
export class BillableServicesResponseDto implements BillableServicesResult {
  @ApiProperty() currency!: string;
  @ApiProperty({ example: 7.5 }) taxRatePercent!: number;
  @ApiProperty({ type: [BillableServiceDto] }) services!: BillableServiceDto[];

  static fromResult(result: BillableServicesResult): BillableServicesResponseDto {
    return result;
  }
}
