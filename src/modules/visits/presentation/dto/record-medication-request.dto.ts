import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { MedicationAdministrationOutcome } from '../../domain/medication-administration-outcome.enum';

const MAX_NOTE_LENGTH = 500;

/** What the caregiver did with a scheduled medication, and an optional reason. */
export class RecordMedicationRequestDto {
  @ApiProperty({
    enum: MedicationAdministrationOutcome,
    enumName: 'MedicationAdministrationOutcome',
    example: MedicationAdministrationOutcome.Administered,
  })
  @IsEnum(MedicationAdministrationOutcome)
  outcome!: MedicationAdministrationOutcome;

  @ApiPropertyOptional({ nullable: true, example: 'Patient refused the dose' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTE_LENGTH)
  note?: string | null;

  @ApiPropertyOptional({
    minimum: 0,
    description: 'The checklist task position this was administered under',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  visitTaskPosition?: number;
}
