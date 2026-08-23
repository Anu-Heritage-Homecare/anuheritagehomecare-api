import { ApiProperty } from '@nestjs/swagger';
import { VisitReviewResult } from '../../application/dto/visit-review.result';
import { VisitStatus } from '../../domain/visit-status.enum';

/**
 * The pre completion review checklist for a visit. Each flag reports whether that
 * part of the record is filled in, so the app can render the review screen. It
 * never blocks completion; optional items may be left unfilled.
 */
export class VisitReviewResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: VisitStatus, enumName: 'VisitStatus' })
  status!: VisitStatus;

  @ApiProperty({ description: 'Number of checklist tasks assigned to the visit' })
  tasksTotal!: number;

  @ApiProperty({ description: 'Number of those tasks marked complete' })
  tasksCompleted!: number;

  @ApiProperty({ description: 'True when the visit has tasks and all are complete' })
  allTasksCompleted!: boolean;

  @ApiProperty({ description: 'At least one scheduled medication was recorded' })
  medicationGiven!: boolean;

  @ApiProperty({ description: 'At least one set of vitals was recorded' })
  vitalsRecorded!: boolean;

  @ApiProperty({ description: 'A visit note was saved' })
  notesAdded!: boolean;

  @ApiProperty({ description: 'A family note was saved (optional)' })
  familyNoteAdded!: boolean;

  @ApiProperty({ description: 'At least one photo was attached' })
  photosUploaded!: boolean;

  static fromResult(result: VisitReviewResult): VisitReviewResponseDto {
    const dto = new VisitReviewResponseDto();
    dto.id = result.id;
    dto.status = result.status;
    dto.tasksTotal = result.tasksTotal;
    dto.tasksCompleted = result.tasksCompleted;
    dto.allTasksCompleted = result.allTasksCompleted;
    dto.medicationGiven = result.medicationGiven;
    dto.vitalsRecorded = result.vitalsRecorded;
    dto.notesAdded = result.notesAdded;
    dto.familyNoteAdded = result.familyNoteAdded;
    dto.photosUploaded = result.photosUploaded;
    return dto;
  }
}
