import { ApiProperty } from '@nestjs/swagger';
import {
  ResolvedOverviewResult,
  ResolvedRowResult,
} from '../../application/dto/resolved-overview.result';

class ResolvedRowDto implements ResolvedRowResult {
  @ApiProperty() id!: string;
  @ApiProperty() kind!: string;
  @ApiProperty() type!: string;
  @ApiProperty() description!: string;
  @ApiProperty() source!: string;
  @ApiProperty() resolvedBy!: string;
  @ApiProperty() resolvedDateLabel!: string;
  @ApiProperty() resolvedAt!: string;
  @ApiProperty() resolutionTimeLabel!: string;
}

/** The Resolved tab response. */
export class ResolvedOverviewResponseDto implements ResolvedOverviewResult {
  @ApiProperty() generatedAt!: string;
  @ApiProperty({ nullable: true }) avgResolutionLabel!: string | null;
  @ApiProperty({ type: [ResolvedRowDto] }) items!: ResolvedRowDto[];

  static fromResult(result: ResolvedOverviewResult): ResolvedOverviewResponseDto {
    return result;
  }
}
