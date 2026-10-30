import { ApiProperty } from '@nestjs/swagger';
import { AttachmentPreviewResult } from '../../application/dto/attachment-preview.result';

export class AttachmentPreviewResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() fileName!: string;
  @ApiProperty() sizeLabel!: string;
  @ApiProperty({ nullable: true }) uploadedByLabel!: string | null;
  @ApiProperty() uploadDateLabel!: string;
  @ApiProperty({ nullable: true }) linkedVisitId!: string | null;
  @ApiProperty({ nullable: true }) linkedVisitReference!: string | null;
  @ApiProperty({ description: 'Delivery URL for Download/Share, empty if store not configured' })
  url!: string;

  static fromResult(result: AttachmentPreviewResult): AttachmentPreviewResponseDto {
    return Object.assign(new AttachmentPreviewResponseDto(), result);
  }
}
