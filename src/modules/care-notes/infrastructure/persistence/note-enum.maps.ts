import { NoteCategory as PrismaCategory } from '@prisma/client';
import { NoteCategory } from '../../domain/note-category.enum';

export const TO_DOMAIN_NOTE_CATEGORY: Record<PrismaCategory, NoteCategory> = {
  VISIT_NOTE: NoteCategory.VisitNote,
  CLINICAL: NoteCategory.Clinical,
  COORDINATOR: NoteCategory.Coordinator,
  FAMILY_COMMUNICATION: NoteCategory.FamilyCommunication,
  INCIDENT: NoteCategory.Incident,
};

export const TO_PERSISTENCE_NOTE_CATEGORY: Record<NoteCategory, PrismaCategory> = {
  [NoteCategory.VisitNote]: 'VISIT_NOTE',
  [NoteCategory.Clinical]: 'CLINICAL',
  [NoteCategory.Coordinator]: 'COORDINATOR',
  [NoteCategory.FamilyCommunication]: 'FAMILY_COMMUNICATION',
  [NoteCategory.Incident]: 'INCIDENT',
};
