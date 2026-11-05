import { ApiProperty } from '@nestjs/swagger';
import { RecipientServicePreviewResult } from '../../application/dto/invoice-wizard.result';

/** The Service Details Preview card on step 2 of the Create Invoice wizard. */
export class RecipientServicePreviewResponseDto implements RecipientServicePreviewResult {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Mrs. Funmilayo Adeyemi' }) name!: string;
  @ApiProperty({ nullable: true, type: String, example: 'Full-Time Dementia Care Support' })
  carePlanModel!: string | null;
  @ApiProperty({ nullable: true, type: String, example: 'Chioma Nnaji' })
  assignedCaregiverName!: string | null;
  @ApiProperty({ nullable: true, type: String, example: 'Registered Nurse' })
  assignedCaregiverTitle!: string | null;
  @ApiProperty({ type: [String], example: ['Meal Preparation', 'Bathing'] })
  keyBillableTargets!: string[];

  static fromResult(result: RecipientServicePreviewResult): RecipientServicePreviewResponseDto {
    return result;
  }
}
