import { ApiProperty } from '@nestjs/swagger';
import {
  FamilyVisitDetailResult,
  FamilyVisitsResult,
  FamilyVisitSummaryResult,
} from '../../application/dto/family-visit.result';

class CaregiverRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Sarah Adams John' })
  name!: string;

  @ApiProperty({ nullable: true, description: 'Opaque profile photo key (upload deferred)' })
  photoKey!: string | null;
}

export class FamilyVisitSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'COMPLETED' })
  status!: string;

  @ApiProperty({ example: '2026-11-12' })
  date!: string;

  @ApiProperty({ example: 562 })
  startMinute!: number;

  @ApiProperty({ example: 720 })
  endMinute!: number;

  @ApiProperty({ nullable: true })
  clockInAt!: string | null;

  @ApiProperty({ nullable: true })
  clockOutAt!: string | null;

  @ApiProperty({ type: CaregiverRefDto, nullable: true })
  caregiver!: CaregiverRefDto | null;

  static from(result: FamilyVisitSummaryResult): FamilyVisitSummaryDto {
    return Object.assign(new FamilyVisitSummaryDto(), result);
  }
}

export class FamilyVisitsResponseDto {
  @ApiProperty({ type: FamilyVisitSummaryDto, nullable: true })
  currentVisit!: FamilyVisitSummaryDto | null;

  @ApiProperty({ type: [FamilyVisitSummaryDto] })
  pastVisits!: FamilyVisitSummaryDto[];

  static fromResult(result: FamilyVisitsResult): FamilyVisitsResponseDto {
    const dto = new FamilyVisitsResponseDto();
    dto.currentVisit =
      result.currentVisit === null ? null : FamilyVisitSummaryDto.from(result.currentVisit);
    dto.pastVisits = result.pastVisits.map((visit) => FamilyVisitSummaryDto.from(visit));
    return dto;
  }
}

class TimelineEventDto {
  @ApiProperty()
  at!: string;

  @ApiProperty({ enum: ['ARRIVED', 'DEPARTED', 'TASK', 'MEDICATION', 'VITALS', 'BREAK'] })
  kind!: string;

  @ApiProperty({ example: 'Blood pressure recorded' })
  label!: string;

  @ApiProperty({ nullable: true, example: '120/80 mmHg' })
  detail!: string | null;
}

class RecipientRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  gender!: string;

  @ApiProperty()
  age!: number;

  @ApiProperty({ nullable: true })
  photoKey!: string | null;
}

class VisitTaskDto {
  @ApiProperty()
  label!: string;

  @ApiProperty()
  completed!: boolean;
}

class VisitHealthDto {
  @ApiProperty({ nullable: true })
  vitals!: FamilyVisitDetailResult['health']['vitals'];

  @ApiProperty()
  observation!: FamilyVisitDetailResult['health']['observation'];
}

class VisitNoteDto {
  @ApiProperty({ nullable: true })
  author!: string | null;

  @ApiProperty()
  at!: string;

  @ApiProperty({ enum: ['CARE_TEAM', 'FAMILY'] })
  audience!: string;

  @ApiProperty()
  text!: string;
}

export class FamilyVisitDetailResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  date!: string;

  @ApiProperty()
  startMinute!: number;

  @ApiProperty()
  endMinute!: number;

  @ApiProperty({ nullable: true })
  clockInAt!: string | null;

  @ApiProperty({ nullable: true })
  clockOutAt!: string | null;

  @ApiProperty({ type: CaregiverRefDto, nullable: true })
  caregiver!: CaregiverRefDto | null;

  @ApiProperty({ type: RecipientRefDto })
  recipient!: RecipientRefDto;

  @ApiProperty({ type: [TimelineEventDto] })
  timeline!: TimelineEventDto[];

  @ApiProperty({ type: [VisitTaskDto] })
  tasks!: VisitTaskDto[];

  @ApiProperty({ type: VisitHealthDto })
  health!: VisitHealthDto;

  @ApiProperty({ type: [VisitNoteDto] })
  notes!: VisitNoteDto[];

  @ApiProperty({ type: [String] })
  photoKeys!: string[];

  static fromResult(result: FamilyVisitDetailResult): FamilyVisitDetailResponseDto {
    return Object.assign(new FamilyVisitDetailResponseDto(), result);
  }
}
