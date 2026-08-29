import { ApiProperty } from '@nestjs/swagger';
import {
  DashboardRecipientResult,
  DashboardTodayVisitResult,
  DashboardUpdateResult,
  FamilyDashboardResult,
} from '../../application/dto/family-dashboard.result';

class DashboardGreetingDto {
  @ApiProperty({ example: 'Sarah' })
  ownerFirstName!: string;

  @ApiProperty({ nullable: true, example: 'Mrs Moses Rose' })
  recipientName!: string | null;
}

class DashboardProgressDto {
  @ApiProperty({ example: 2 })
  completed!: number;

  @ApiProperty({ example: 3 })
  total!: number;

  @ApiProperty({ example: 67, description: 'Completed tasks as a whole percentage' })
  percent!: number;
}

class DashboardTaskDto {
  @ApiProperty({ example: 'Medication' })
  label!: string;

  @ApiProperty()
  completed!: boolean;
}

class DashboardCaregiverDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Sarah Adams John' })
  name!: string;

  @ApiProperty({ nullable: true, description: 'Opaque profile photo key (upload deferred)' })
  photoKey!: string | null;
}

class DashboardUpdateDto {
  @ApiProperty({ description: 'When the activity happened (ISO 8601)' })
  at!: string;

  @ApiProperty({ enum: ['MEDICATION', 'VITALS', 'TASK'] })
  kind!: string;

  @ApiProperty({ example: 'Breakfast completed' })
  label!: string;
}

class DashboardTodayVisitDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'IN_PROGRESS' })
  status!: string;

  @ApiProperty({ nullable: true, description: 'When the caregiver clocked in (ISO 8601)' })
  startedAt!: string | null;

  @ApiProperty({ example: 543, description: 'Planned start, minutes from midnight' })
  scheduledStartMinute!: number;

  @ApiProperty({ example: 1140, description: 'Planned finish, minutes from midnight' })
  estimatedFinishMinute!: number;

  @ApiProperty({ type: DashboardProgressDto })
  progress!: DashboardProgressDto;

  @ApiProperty({ type: [DashboardTaskDto] })
  tasks!: DashboardTaskDto[];

  @ApiProperty({ type: DashboardCaregiverDto, nullable: true })
  caregiver!: DashboardCaregiverDto | null;

  static fromResult(result: DashboardTodayVisitResult): DashboardTodayVisitDto {
    const dto = new DashboardTodayVisitDto();
    dto.id = result.id;
    dto.status = result.status;
    dto.startedAt = result.startedAt;
    dto.scheduledStartMinute = result.scheduledStartMinute;
    dto.estimatedFinishMinute = result.estimatedFinishMinute;
    dto.progress = result.progress;
    dto.tasks = result.tasks;
    dto.caregiver = result.caregiver;
    return dto;
  }
}

class DashboardRecipientDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Mrs Moses Rose' })
  name!: string;

  @ApiProperty({ example: 'FEMALE' })
  gender!: string;

  @ApiProperty({ example: 82 })
  age!: number;

  @ApiProperty({ nullable: true })
  photoKey!: string | null;

  @ApiProperty({
    enum: ['RECEIVING_CARE', 'ON_BREAK', 'SCHEDULED', 'COMPLETED', 'NO_VISIT_TODAY'],
  })
  careState!: string;

  @ApiProperty({ type: DashboardTodayVisitDto, nullable: true })
  todayVisit!: DashboardTodayVisitDto | null;

  @ApiProperty({ type: [DashboardUpdateDto] })
  recentUpdates!: DashboardUpdateDto[];

  static fromResult(result: DashboardRecipientResult): DashboardRecipientDto {
    const dto = new DashboardRecipientDto();
    dto.id = result.id;
    dto.name = result.name;
    dto.gender = result.gender;
    dto.age = result.age;
    dto.photoKey = result.photoKey;
    dto.careState = result.careState;
    dto.todayVisit =
      result.todayVisit === null ? null : DashboardTodayVisitDto.fromResult(result.todayVisit);
    dto.recentUpdates = result.recentUpdates.map((update: DashboardUpdateResult) => ({
      at: update.at,
      kind: update.kind,
      label: update.label,
    }));
    return dto;
  }
}

/** The family owner home dashboard: greeting plus a card per active recipient. */
export class FamilyDashboardResponseDto {
  @ApiProperty({ type: DashboardGreetingDto })
  greeting!: DashboardGreetingDto;

  @ApiProperty({ type: [DashboardRecipientDto] })
  recipients!: DashboardRecipientDto[];

  static fromResult(result: FamilyDashboardResult): FamilyDashboardResponseDto {
    const dto = new FamilyDashboardResponseDto();
    dto.greeting = {
      ownerFirstName: result.greeting.ownerFirstName,
      recipientName: result.greeting.recipientName,
    };
    dto.recipients = result.recipients.map((recipient) =>
      DashboardRecipientDto.fromResult(recipient),
    );
    return dto;
  }
}
