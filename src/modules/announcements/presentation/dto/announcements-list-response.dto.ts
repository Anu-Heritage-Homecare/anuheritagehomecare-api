import { ApiProperty } from '@nestjs/swagger';
import { AnnouncementListResult } from '../../application/dto/announcements-list.result';

class AnnouncementCountsDto {
  @ApiProperty() draft!: number;
  @ApiProperty() scheduled!: number;
  @ApiProperty() published!: number;
  @ApiProperty() archived!: number;
}

class AnnouncementListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ type: [String] }) audienceLabels!: string[];
  @ApiProperty() statusLabel!: string;
  @ApiProperty() dateLabel!: string;
  @ApiProperty({ nullable: true }) authorName!: string | null;
  @ApiProperty({ nullable: true }) authorPhotoKey!: string | null;
}

export class AnnouncementsListResponseDto {
  @ApiProperty({ type: AnnouncementCountsDto }) counts!: AnnouncementCountsDto;
  @ApiProperty({ type: [AnnouncementListItemDto] }) announcements!: AnnouncementListItemDto[];

  static fromResult(result: AnnouncementListResult): AnnouncementsListResponseDto {
    const dto = new AnnouncementsListResponseDto();
    Object.assign(dto, result);
    return dto;
  }
}
