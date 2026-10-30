import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { AlertSeverity } from '../../domain/alert-severity.enum';
import { IncidentCategory } from '../../domain/incident-category.enum';

const CATEGORIES = Object.values(IncidentCategory);
const SEVERITIES = Object.values(AlertSeverity);

/** File a new incident from the Report Incident modal (or the Incidents screen). */
export class ReportIncidentDto {
  @ApiProperty({ enum: CATEGORIES })
  @IsIn(CATEGORIES)
  category!: IncidentCategory;

  @ApiProperty({ enum: SEVERITIES })
  @IsIn(SEVERITIES)
  severity!: AlertSeverity;

  @ApiProperty({ description: 'Description of the incident (required)' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  detail!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) reporterName?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() relatedCareRecipientId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() relatedVisitId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() relatedCaregiverId?: string;

  /**
   * Safety attestation: the reporter certifies safety precautions were followed and
   * the family notified. The report cannot be submitted unless this is true.
   */
  @ApiProperty({
    description: 'Must be true: certifies safety precautions followed and family notified',
  })
  @Equals(true)
  safetyConfirmed!: boolean;
}
