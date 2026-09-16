import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsUUID } from 'class-validator';
import {
  BULK_APPLICATION_ACTIONS,
  BulkApplicationAction,
  BulkUpdateApplicationsResult,
} from '../../application/use-cases/bulk-update-applications.use-case';

/** Approve or reject a selection of onboarding applications in one call. */
export class BulkApplicationsRequestDto {
  @ApiProperty({ type: [String], format: 'uuid', maxItems: 100 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids!: string[];

  @ApiProperty({ enum: BULK_APPLICATION_ACTIONS })
  @IsIn(BULK_APPLICATION_ACTIONS)
  action!: BulkApplicationAction;
}

/** The outcome of a bulk application action. */
export class BulkApplicationsResponseDto implements BulkUpdateApplicationsResult {
  @ApiProperty() updated!: number;
  @ApiProperty({ type: [String] }) notFound!: string[];

  static fromResult(result: BulkUpdateApplicationsResult): BulkApplicationsResponseDto {
    return result;
  }
}
