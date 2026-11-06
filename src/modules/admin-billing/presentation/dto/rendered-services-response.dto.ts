import { ApiProperty } from '@nestjs/swagger';
import {
  RenderedServiceResult,
  RenderedServicesResult,
} from '../../application/dto/rendered-services.result';

class RenderedServiceDto implements RenderedServiceResult {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'PERSONAL_CARE_SUPPORT' }) code!: string;
  @ApiProperty({ example: 'Personal Care Support' }) name!: string;
  @ApiProperty({ example: 'Hourly Care Plan Support Tasks' }) description!: string;
  @ApiProperty({ enum: ['HOURLY', 'SESSION', 'FIXED'] }) unit!: 'HOURLY' | 'SESSION' | 'FIXED';
  @ApiProperty({ nullable: true, type: Number, example: 1_500_000 }) rateMinor!: number | null;
  @ApiProperty({ example: 40, description: 'Quantity derived from completed visits' })
  suggestedQuantity!: number;
  @ApiProperty({ example: 10, description: 'Completed visits that fed this line' })
  sourceVisitCount!: number;
  @ApiProperty({ example: 60_000_000, description: 'rateMinor * suggestedQuantity' })
  amountMinor!: number;
}

/** The Select Billable Services step: catalog pre filled from the recipient's care logs. */
export class RenderedServicesResponseDto implements RenderedServicesResult {
  @ApiProperty() currency!: string;
  @ApiProperty() periodStart!: string;
  @ApiProperty() periodEnd!: string;
  @ApiProperty({ example: 7.5 }) taxRatePercent!: number;
  @ApiProperty({ type: [RenderedServiceDto] }) services!: RenderedServiceDto[];

  static fromResult(result: RenderedServicesResult): RenderedServicesResponseDto {
    return result;
  }
}
