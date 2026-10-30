import { ApiProperty } from '@nestjs/swagger';
import { AnnouncementDetailResult } from '../../application/dto/announcement-detail.result';

export class AnnouncementDetailResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty({ type: [String] }) audienceLabels!: string[];
  @ApiProperty() priorityLabel!: string;
  @ApiProperty() statusLabel!: string;
  @ApiProperty() dateLabel!: string;
  @ApiProperty({ nullable: true }) authorName!: string | null;
  @ApiProperty({ nullable: true }) authorPhotoKey!: string | null;
  @ApiProperty({ nullable: true }) scheduledFor!: string | null;
  @ApiProperty({ nullable: true }) publishedAt!: string | null;
  @ApiProperty({ nullable: true }) archivedAt!: string | null;
  @ApiProperty() createdAt!: string;

  static fromResult(result: AnnouncementDetailResult): AnnouncementDetailResponseDto {
    const dto = new AnnouncementDetailResponseDto();
    Object.assign(dto, result);
    return dto;
  }
}
