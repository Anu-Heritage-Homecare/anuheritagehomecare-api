import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Gender } from '../../domain/gender.enum';

/**
 * Request contract for the first onboarding step: the loved one's identity
 * profile. Submitting this creates the draft the family owner then resumes.
 */
export class CreateCareRecipientDraftRequestDto {
  @ApiProperty({ example: 'Grace Okafor', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: Gender, enumName: 'Gender', example: Gender.Female })
  @IsIn(Object.values(Gender))
  gender!: string;

  @ApiProperty({ example: '1950-04-20', description: 'Date of birth as an ISO calendar date' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiProperty({ example: 'Lagos', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  city!: string;

  @ApiProperty({ example: 'Lagos State', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  state!: string;

  @ApiProperty({ example: 'No 4 Okeowoyomi street', maxLength: 300 })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  fullAddress!: string;

  @ApiProperty({
    example: 'Parent',
    maxLength: 120,
    description: 'Relationship to the family owner',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  relationship!: string;

  @ApiProperty({ example: 'Lives with family', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  livingSituation!: string;

  @ApiPropertyOptional({
    example: 'care-recipients/photos/abc123.jpg',
    maxLength: 500,
    description: 'Opaque storage key for a previously uploaded profile picture',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoKey?: string;
}
