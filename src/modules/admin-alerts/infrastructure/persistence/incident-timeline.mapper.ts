import {
  IncidentTimelineEvent as PrismaEvent,
  IncidentTimelineEventKind as PrismaKind,
} from '@prisma/client';
import { IncidentTimelineEventKind } from '../../domain/incident-timeline-event-kind.enum';
import { IncidentTimelineEvent } from '../../domain/incident-timeline-event.entity';

const TO_DOMAIN_KIND: Record<PrismaKind, IncidentTimelineEventKind> = {
  COORDINATOR_NOTIFIED: IncidentTimelineEventKind.CoordinatorNotified,
  CAREGIVER_CONTACT: IncidentTimelineEventKind.CaregiverContact,
  FAMILY_NOTIFICATION: IncidentTimelineEventKind.FamilyNotification,
  REVIEW_STARTED: IncidentTimelineEventKind.ReviewStarted,
  NOTE: IncidentTimelineEventKind.Note,
  OTHER: IncidentTimelineEventKind.Other,
};

const TO_PERSISTENCE_KIND: Record<IncidentTimelineEventKind, PrismaKind> = {
  [IncidentTimelineEventKind.CoordinatorNotified]: 'COORDINATOR_NOTIFIED',
  [IncidentTimelineEventKind.CaregiverContact]: 'CAREGIVER_CONTACT',
  [IncidentTimelineEventKind.FamilyNotification]: 'FAMILY_NOTIFICATION',
  [IncidentTimelineEventKind.ReviewStarted]: 'REVIEW_STARTED',
  [IncidentTimelineEventKind.Note]: 'NOTE',
  [IncidentTimelineEventKind.Other]: 'OTHER',
};

/** Translates the incident timeline event row to and from the domain. */
export class IncidentTimelineMapper {
  static toDomain(row: PrismaEvent): IncidentTimelineEvent {
    return IncidentTimelineEvent.rehydrate(row.id, {
      incidentId: row.incidentId,
      at: row.at,
      kind: TO_DOMAIN_KIND[row.kind],
      title: row.title,
      description: row.description,
      actorName: row.actorName,
      actorRole: row.actorRole,
      authorAdminId: row.authorAdminId,
    });
  }

  static kindToPersistence(kind: IncidentTimelineEventKind): PrismaKind {
    return TO_PERSISTENCE_KIND[kind];
  }
}
