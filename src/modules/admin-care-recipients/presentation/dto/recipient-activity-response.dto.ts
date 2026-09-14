import { ApiProperty } from '@nestjs/swagger';
import { RecipientActivityResult } from '../../application/dto/recipient-activity.result';

class ActivityItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: String, format: 'date-time' }) occurredAt!: string;
  @ApiProperty() category!: string;
  @ApiProperty() type!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ nullable: true }) performedByName!: string | null;
  @ApiProperty({ nullable: true }) performedByRole!: string | null;
}

class ActivityPageDto {
  @ApiProperty({ type: [ActivityItemDto] }) items!: ActivityItemDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class RecipientActivityResponseDto {
  @ApiProperty() windowDays!: number;
  @ApiProperty({ type: [String] }) users!: string[];
  @ApiProperty({ type: ActivityPageDto }) page!: ActivityPageDto;

  static fromResult(result: RecipientActivityResult): RecipientActivityResponseDto {
    const dto = new RecipientActivityResponseDto();
    dto.windowDays = result.windowDays;
    dto.users = [...result.users];
    dto.page = {
      items: result.page.items.map((item) => ({
        id: item.id,
        occurredAt: item.occurredAt.toISOString(),
        category: item.category,
        type: item.type,
        title: item.title,
        description: item.description,
        performedByName: item.performedByName,
        performedByRole: item.performedByRole,
      })),
      page: result.page.page,
      pageSize: result.page.pageSize,
      total: result.page.total,
      totalPages: result.page.totalPages,
    };
    return dto;
  }
}
