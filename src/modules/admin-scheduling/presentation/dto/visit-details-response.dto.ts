import { ApiProperty } from '@nestjs/swagger';
import {
  RelatedVisitResult,
  VisitCarePlanResult,
  VisitCaregiverResult,
  VisitDetailResult,
  VisitInformationResult,
  VisitNoteResult,
  VisitOverviewResult,
  VisitRecipientResult,
  VisitTaskResult,
  VisitTimelineEventResult,
} from '../../application/dto/visit-details.result';

class ActionsDto {
  @ApiProperty() canEdit!: boolean;
  @ApiProperty() canReassign!: boolean;
  @ApiProperty() canCancel!: boolean;
}

class InformationDto implements VisitInformationResult {
  @ApiProperty() date!: string;
  @ApiProperty() time!: string;
  @ApiProperty() endTime!: string;
  @ApiProperty() durationHours!: number;
  @ApiProperty() serviceType!: string;
  @ApiProperty() priority!: string;
  @ApiProperty() status!: string;
  @ApiProperty() location!: string;
  @ApiProperty() recurring!: string;
}

class TaskDto implements VisitTaskResult {
  @ApiProperty() label!: string;
  @ApiProperty() completed!: boolean;
  @ApiProperty() status!: string;
}

class TasksDto {
  @ApiProperty() summary!: string;
  @ApiProperty() completed!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [TaskDto] }) items!: TaskDto[];
}

export class VisitNoteDto implements VisitNoteResult {
  @ApiProperty() authorName!: string;
  @ApiProperty() authorRole!: string;
  @ApiProperty() audience!: string;
  @ApiProperty() text!: string;
  @ApiProperty() at!: string;
}

export class VisitOverviewDto implements VisitOverviewResult {
  @ApiProperty({ type: InformationDto }) information!: InformationDto;
  @ApiProperty({ type: TasksDto }) tasks!: TasksDto;
  @ApiProperty({ type: [VisitNoteDto] }) notes!: VisitNoteDto[];
}

class EmergencyContactDto {
  @ApiProperty() name!: string;
  @ApiProperty() phone!: string;
  @ApiProperty({ nullable: true, type: String }) relationship!: string | null;
}

class MedicationDto {
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) dose!: string | null;
  @ApiProperty({ type: [String] }) times!: string[];
}

export class VisitRecipientDto implements VisitRecipientResult {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: Number }) age!: number | null;
  @ApiProperty() gender!: string;
  @ApiProperty({ nullable: true, type: String }) primaryCondition!: string | null;
  @ApiProperty({ nullable: true, type: String }) careLevel!: string | null;
  @ApiProperty() address!: string;
  @ApiProperty({ nullable: true, type: EmergencyContactDto })
  emergencyContact!: EmergencyContactDto | null;
  @ApiProperty({ type: [String] }) conditions!: string[];
  @ApiProperty({ type: [String] }) allergies!: string[];
  @ApiProperty({ type: [String] }) careNeeds!: string[];
  @ApiProperty({ type: [MedicationDto] }) medications!: MedicationDto[];
}

export class VisitCaregiverDto implements VisitCaregiverResult {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) title!: string | null;
  @ApiProperty({ nullable: true, type: String }) branch!: string | null;
  @ApiProperty() onVisit!: boolean;
  @ApiProperty({ nullable: true, type: String }) clockIn!: string | null;
  @ApiProperty({ nullable: true, type: Number }) performanceRating!: number | null;
}

export class VisitCarePlanDto implements VisitCarePlanResult {
  @ApiProperty() serviceType!: string;
  @ApiProperty({ nullable: true, type: String }) frequency!: string | null;
  @ApiProperty({ type: [String] }) days!: string[];
  @ApiProperty({ nullable: true, type: String }) startTime!: string | null;
  @ApiProperty() durationHours!: number;
  @ApiProperty({ nullable: true, type: String }) expectedDuration!: string | null;
  @ApiProperty({ type: [String] }) services!: string[];
  @ApiProperty({ type: [String] }) instructions!: string[];
  @ApiProperty({ type: [String] }) goals!: string[];
}

export class VisitTimelineEventDto implements VisitTimelineEventResult {
  @ApiProperty() type!: string;
  @ApiProperty() label!: string;
  @ApiProperty() at!: string;
}

class RelatedVisitDto implements RelatedVisitResult {
  @ApiProperty() id!: string;
  @ApiProperty() date!: string;
  @ApiProperty() label!: string;
  @ApiProperty() status!: string;
}

class RelatedVisitsDto {
  @ApiProperty({ nullable: true, type: RelatedVisitDto }) previous!: RelatedVisitDto | null;
  @ApiProperty({ nullable: true, type: RelatedVisitDto }) next!: RelatedVisitDto | null;
}

/** The full Visit Details response (all tabs). */
export class VisitDetailResponseDto implements VisitDetailResult {
  @ApiProperty() id!: string;
  @ApiProperty() status!: string;
  @ApiProperty() statusLabel!: string;
  @ApiProperty() serviceType!: string;
  @ApiProperty() priority!: string;
  @ApiProperty({ type: ActionsDto }) actions!: ActionsDto;
  @ApiProperty({ type: VisitOverviewDto }) overview!: VisitOverviewDto;
  @ApiProperty({ type: VisitRecipientDto }) recipient!: VisitRecipientDto;
  @ApiProperty({ nullable: true, type: VisitCaregiverDto }) caregiver!: VisitCaregiverDto | null;
  @ApiProperty({ type: VisitCarePlanDto }) carePlan!: VisitCarePlanDto;
  @ApiProperty({ type: [VisitNoteDto] }) notes!: VisitNoteDto[];
  @ApiProperty({ type: [VisitTimelineEventDto] }) history!: VisitTimelineEventDto[];
  @ApiProperty({ type: RelatedVisitsDto }) relatedVisits!: RelatedVisitsDto;

  static fromResult(result: VisitDetailResult): VisitDetailResponseDto {
    return result;
  }
}
