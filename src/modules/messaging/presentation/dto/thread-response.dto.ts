import { ApiProperty } from '@nestjs/swagger';
import { ThreadResult } from '../../application/dto/thread.result';

class ThreadAttachmentDto {
  @ApiProperty() id!: string;
  @ApiProperty() fileName!: string;
  @ApiProperty() sizeLabel!: string;
  @ApiProperty({ description: 'Delivery URL, or empty when the store is not configured' })
  url!: string;
}

class ThreadMessageDto {
  @ApiProperty() id!: string;
  @ApiProperty() senderType!: string;
  @ApiProperty({ nullable: true }) senderName!: string | null;
  @ApiProperty() body!: string;
  @ApiProperty({ type: [ThreadAttachmentDto] }) attachments!: ThreadAttachmentDto[];
  @ApiProperty() at!: string;
  @ApiProperty() timeLabel!: string;
  @ApiProperty() mine!: boolean;
}

class ThreadLinkedRecipientDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) medicationSummary!: string | null;
}

class ThreadParticipantDto {
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) roleLabel!: string | null;
  @ApiProperty({ nullable: true }) statusLabel!: string | null;
  @ApiProperty() isYou!: boolean;
}

class ThreadLinkedVisitDto {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty({ nullable: true }) typeLabel!: string | null;
  @ApiProperty({ nullable: true }) timeWindowLabel!: string | null;
  @ApiProperty({ nullable: true }) date!: string | null;
}

export class ThreadResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() kind!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) roleLabel!: string | null;
  @ApiProperty({ type: [ThreadParticipantDto] }) participants!: ThreadParticipantDto[];
  @ApiProperty({ type: ThreadLinkedRecipientDto, nullable: true })
  linkedRecipient!: ThreadLinkedRecipientDto | null;
  @ApiProperty({ type: ThreadLinkedVisitDto, nullable: true })
  linkedVisit!: ThreadLinkedVisitDto | null;
  @ApiProperty({ type: [ThreadAttachmentDto] }) sharedFiles!: ThreadAttachmentDto[];
  @ApiProperty({ type: [ThreadMessageDto] }) messages!: ThreadMessageDto[];

  static fromResult(result: ThreadResult): ThreadResponseDto {
    const dto = new ThreadResponseDto();
    Object.assign(dto, result);
    return dto;
  }
}
