import { ApiProperty } from '@nestjs/swagger';

export class AnnouncementCreatedDto {
  @ApiProperty() id!: string;
}
