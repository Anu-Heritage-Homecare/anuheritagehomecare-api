import { ApiProperty } from '@nestjs/swagger';
import { InboxResult } from '../../application/dto/inbox.result';

class InboxCountsDto {
  @ApiProperty() all!: number;
  @ApiProperty() unread!: number;
  @ApiProperty() direct!: number;
  @ApiProperty() caregivers!: number;
  @ApiProperty() families!: number;
  @ApiProperty() visits!: number;
  @ApiProperty() announcements!: number;
}

class InboxConversationDto {
  @ApiProperty() id!: string;
  @ApiProperty() kind!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) roleLabel!: string | null;
  @ApiProperty({ nullable: true }) preview!: string | null;
  @ApiProperty({ nullable: true }) timeLabel!: string | null;
  @ApiProperty() unreadCount!: number;
}

export class InboxResponseDto {
  @ApiProperty({ type: InboxCountsDto }) counts!: InboxCountsDto;
  @ApiProperty({ type: [InboxConversationDto] }) conversations!: InboxConversationDto[];

  static fromResult(result: InboxResult): InboxResponseDto {
    const dto = new InboxResponseDto();
    Object.assign(dto, result);
    return dto;
  }
}
