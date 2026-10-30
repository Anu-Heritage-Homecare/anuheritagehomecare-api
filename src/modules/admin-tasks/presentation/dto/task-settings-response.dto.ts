import { ApiProperty } from '@nestjs/swagger';
import { TaskSettingsResult } from '../../application/dto/task-settings.result';

class CategorySettingDto {
  @ApiProperty() category!: string;
  @ApiProperty() label!: string;
  @ApiProperty({ nullable: true }) color!: string | null;
  @ApiProperty({ nullable: true }) icon!: string | null;
  @ApiProperty({ nullable: true }) autoAssignLabel!: string | null;
  @ApiProperty() tasksCount!: number;
  @ApiProperty() active!: boolean;
}

class PrioritySettingDto {
  @ApiProperty() priority!: string;
  @ApiProperty() level!: number;
  @ApiProperty() label!: string;
  @ApiProperty({ nullable: true }) color!: string | null;
  @ApiProperty({ nullable: true }) slaHours!: number | null;
  @ApiProperty({ nullable: true }) escalation!: string | null;
  @ApiProperty() isDefault!: boolean;
}

class NotificationSettingDto {
  @ApiProperty() key!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ type: [String] }) channels!: string[];
  @ApiProperty() channelsLabel!: string;
}

export class TaskSettingsResponseDto {
  @ApiProperty({ type: [CategorySettingDto] }) categories!: CategorySettingDto[];
  @ApiProperty({ type: [PrioritySettingDto] }) priorities!: PrioritySettingDto[];
  @ApiProperty({ type: [NotificationSettingDto] }) notifications!: NotificationSettingDto[];

  static fromResult(result: TaskSettingsResult): TaskSettingsResponseDto {
    const dto = new TaskSettingsResponseDto();
    Object.assign(dto, result);
    return dto;
  }
}
