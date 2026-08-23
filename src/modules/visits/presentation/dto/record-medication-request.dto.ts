import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
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
}
