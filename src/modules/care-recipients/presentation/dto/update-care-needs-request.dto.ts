import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn } from 'class-validator';
import { ALL_CARE_NEEDS, CareNeed } from '../../domain/care-need.enum';

/** Request contract for the second onboarding step: selected care needs. */
export class UpdateCareNeedsRequestDto {
  @ApiProperty({
    isArray: true,
    enum: CareNeed,
    enumName: 'CareNeed',
    example: [CareNeed.Bathing, CareNeed.MealPreparation],
    description: 'Select all that apply; an empty list is allowed',
  })
  @IsArray()
  @ArrayMaxSize(ALL_CARE_NEEDS.length)
  @IsIn(ALL_CARE_NEEDS, { each: true })
  careNeeds!: string[];
}
