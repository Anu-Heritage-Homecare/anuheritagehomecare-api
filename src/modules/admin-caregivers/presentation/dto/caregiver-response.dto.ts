import { ApiProperty } from '@nestjs/swagger';
import {
  CaregiverAssignmentResult,
  CaregiverAvailabilityDayResult,
  CaregiverCertificationResult,
  CaregiverListResult,
  CaregiverNoteResult,
  CaregiverOverviewResult,
  CaregiverPerformanceResult,
  CaregiverRowResult,
  CaregiverTodayVisitResult,
} from '../../application/dto/caregiver.result';

class CaregiverRowDto implements CaregiverRowResult {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) title!: string | null;
  @ApiProperty({ nullable: true, type: String }) branch!: string | null;
  @ApiProperty({ nullable: true, type: String }) employmentType!: string | null;
  @ApiProperty() status!: string;
}

/** The caregivers directory response. */
export class CaregiverListResponseDto implements CaregiverListResult {
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ type: [CaregiverRowDto] }) rows!: CaregiverRowDto[];

  static fromResult(result: CaregiverListResult): CaregiverListResponseDto {
    return result;
  }
}

class PersonalDto {
  @ApiProperty({ nullable: true, type: String }) gender!: string | null;
  @ApiProperty({ nullable: true, type: String }) phone!: string | null;
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty({ nullable: true, type: String }) address!: string | null;
  @ApiProperty({ nullable: true, type: String }) dateOfBirth!: string | null;
  @ApiProperty({ nullable: true, type: Number }) age!: number | null;
  @ApiProperty({ type: [String] }) languages!: string[];
  @ApiProperty({ nullable: true, type: String }) emergencyContactName!: string | null;
  @ApiProperty({ nullable: true, type: String }) emergencyContactPhone!: string | null;
  @ApiProperty({ nullable: true, type: String }) emergencyContactRelationship!: string | null;
  @ApiProperty({ nullable: true, type: String }) emergencyContactEmail!: string | null;
}

class AssignmentDto implements CaregiverAssignmentResult {
  @ApiProperty() recipientName!: string;
  @ApiProperty() role!: string;
  @ApiProperty() since!: string;
}

class TodayVisitDto implements CaregiverTodayVisitResult {
  @ApiProperty() time!: string;
  @ApiProperty() recipientName!: string;
  @ApiProperty() visitType!: string;
  @ApiProperty() status!: string;
}

class PerformanceDto implements CaregiverPerformanceResult {
  @ApiProperty({ nullable: true, type: Number }) ratingAverage!: number | null;
  @ApiProperty() ratingCount!: number;
  @ApiProperty({ nullable: true, type: Number }) satisfactionPercent!: number | null;
  @ApiProperty({ nullable: true, type: Number }) taskCompletionPercent!: number | null;
  @ApiProperty({ nullable: true, type: Number }) punctualityPercent!: number | null;
  @ApiProperty() visitsThisMonth!: number;
  @ApiProperty() hoursLogged!: number;
  @ApiProperty() missedVisits!: number;
}

class CertificationDto implements CaregiverCertificationResult {
  @ApiProperty() name!: string;
  @ApiProperty() expiresAt!: string;
  @ApiProperty() valid!: boolean;
}

class AvailabilitySlotDto {
  @ApiProperty() startMinute!: number;
  @ApiProperty() endMinute!: number;
  @ApiProperty() label!: string;
}

class AvailabilityDayDto implements CaregiverAvailabilityDayResult {
  @ApiProperty() dayLabel!: string;
  @ApiProperty() date!: string;
  @ApiProperty() available!: boolean;
  @ApiProperty({ type: [AvailabilitySlotDto] }) slots!: AvailabilitySlotDto[];
}

class NoteDto implements CaregiverNoteResult {
  @ApiProperty() body!: string;
  @ApiProperty({ nullable: true, type: String }) authorName!: string | null;
  @ApiProperty() createdAt!: string;
}

/** The caregiver Overview tab response. */
export class CaregiverOverviewResponseDto implements CaregiverOverviewResult {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() name!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true, type: String }) title!: string | null;
  @ApiProperty({ nullable: true, type: String }) branch!: string | null;
  @ApiProperty({ nullable: true, type: String }) employmentType!: string | null;
  @ApiProperty({ nullable: true, type: Number }) experienceYears!: number | null;
  @ApiProperty({ nullable: true, type: String }) joinedAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) supervisorName!: string | null;
  @ApiProperty({ nullable: true, type: Number }) maxHoursPerWeek!: number | null;
  @ApiProperty({ nullable: true, type: String }) preferredShift!: string | null;
  @ApiProperty({ nullable: true, type: String }) preferencesNote!: string | null;
  @ApiProperty({ type: PersonalDto }) personal!: PersonalDto;
  @ApiProperty({ type: [AssignmentDto] }) assignments!: AssignmentDto[];
  @ApiProperty({ type: [TodayVisitDto] }) todaySchedule!: TodayVisitDto[];
  @ApiProperty({ type: PerformanceDto }) performance!: PerformanceDto;
  @ApiProperty({ type: [CertificationDto] }) certifications!: CertificationDto[];
  @ApiProperty() fullyCompliant!: boolean;
  @ApiProperty({ type: [String] }) skills!: string[];
  @ApiProperty({ type: [AvailabilityDayDto] }) availability!: AvailabilityDayDto[];
  @ApiProperty({ type: [NoteDto] }) recentNotes!: NoteDto[];

  static fromResult(result: CaregiverOverviewResult): CaregiverOverviewResponseDto {
    return result;
  }
}
