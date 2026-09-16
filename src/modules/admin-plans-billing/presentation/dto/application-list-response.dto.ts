import { ApiProperty } from '@nestjs/swagger';
import {
  ApplicationListResult,
  ApplicationRowResult,
} from '../../application/dto/application-list.result';

class ApplicationRowDto implements ApplicationRowResult {
  @ApiProperty() id!: string;
  @ApiProperty() familyName!: string;
  @ApiProperty() patientName!: string;
  @ApiProperty({ nullable: true, type: String }) selectedPlanType!: string | null;
  @ApiProperty({ nullable: true, type: String }) planName!: string | null;
  @ApiProperty({ nullable: true, type: Number }) monthlyPriceMinor!: number | null;
  @ApiProperty() currency!: string;
  @ApiProperty() paymentStatus!: string;
  @ApiProperty({ nullable: true, type: String }) coordinatorName!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() submittedAt!: string;
}

/** The Recent Care Requests verification queue response. */
export class ApplicationListResponseDto implements ApplicationListResult {
  @ApiProperty() currency!: string;
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ type: [ApplicationRowDto] }) rows!: ApplicationRowDto[];

  static fromResult(result: ApplicationListResult): ApplicationListResponseDto {
    return result;
  }
}
