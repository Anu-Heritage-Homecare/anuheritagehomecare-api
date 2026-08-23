import { Visit } from '../../domain/visit.entity';
import { VisitStatus } from '../../domain/visit-status.enum';

/**
 * The pre completion review of a visit: which parts of the record are filled in,
 * so the app can render the review checklist before the caregiver submits. It
 * reports state only and never blocks completion.
 */
export interface VisitReviewResult {
  id: string;
  status: VisitStatus;
  tasksTotal: number;
  tasksCompleted: number;
  allTasksCompleted: boolean;
  medicationGiven: boolean;
  vitalsRecorded: boolean;
  notesAdded: boolean;
  familyNoteAdded: boolean;
  photosUploaded: boolean;
}

export function toVisitReview(visit: Visit): VisitReviewResult {
  const checklist = visit.completionChecklist;
  return {
    id: visit.id,
    status: visit.status,
    tasksTotal: checklist.tasksTotal,
    tasksCompleted: checklist.tasksCompleted,
    allTasksCompleted: checklist.allTasksCompleted,
    medicationGiven: checklist.medicationGiven,
    vitalsRecorded: checklist.vitalsRecorded,
    notesAdded: checklist.notesAdded,
    familyNoteAdded: checklist.familyNoteAdded,
    photosUploaded: checklist.photosUploaded,
  };
}
