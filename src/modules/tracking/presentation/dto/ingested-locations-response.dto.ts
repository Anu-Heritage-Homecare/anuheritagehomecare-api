import { ApiProperty } from '@nestjs/swagger';
import { IngestLocationsResult } from '../../application/use-cases/ingest-locations.use-case';

/** Acknowledges how many location points were accepted and stored. */
export class IngestedLocationsResponseDto {
  @ApiProperty({ example: 12 })
  accepted!: number;

  static fromResult(result: IngestLocationsResult): IngestedLocationsResponseDto {
    const dto = new IngestedLocationsResponseDto();
    dto.accepted = result.accepted;
    return dto;
  }
}
