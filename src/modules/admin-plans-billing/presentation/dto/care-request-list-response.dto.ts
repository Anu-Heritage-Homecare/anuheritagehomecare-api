import { ApiProperty } from '@nestjs/swagger';
import {
  CareRequestListResult,
  CareRequestRowResult,
} from '../../application/dto/care-request-list.result';

class CareRequestRowDto implements CareRequestRowResult {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true, type: String }) familyName!: string | null;
  @ApiProperty({ nullable: true, type: String }) patientName!: string | null;
  @ApiProperty() careType!: string;
  @ApiProperty() requestedDate!: string;
  @ApiProperty() startMinute!: number;
  @ApiProperty() durationMinutes!: number;
  @ApiProperty({ nullable: true, type: String }) reason!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() createdAt!: string;
}

/** The New Care Requests table response. */
export class CareRequestListResponseDto implements CareRequestListResult {
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ type: [CareRequestRowDto] }) rows!: CareRequestRowDto[];

  static fromResult(result: CareRequestListResult): CareRequestListResponseDto {
    return result;
  }
}
