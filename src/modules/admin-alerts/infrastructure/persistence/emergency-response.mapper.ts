import {
  EmergencyProtocolStep as PrismaStep,
  SosProtocolCompletion as PrismaCompletion,
  SosResponseEvent as PrismaEvent,
  SosResponseEventKind as PrismaKind,
} from '@prisma/client';
import { EmergencyProtocolStep } from '../../domain/emergency-protocol-step.enum';
import { SosResponseEventKind } from '../../domain/sos-response-event-kind.enum';
import { SosProtocolCompletion } from '../../domain/sos-protocol-completion.entity';
import { SosResponseEvent } from '../../domain/sos-response-event.entity';

const TO_DOMAIN_STEP: Record<PrismaStep, EmergencyProtocolStep> = {
  SOS_CONFIRMATION: EmergencyProtocolStep.SosConfirmation,
  ASSESS_VISIT: EmergencyProtocolStep.AssessVisit,
  NOTIFY_FAMILY: EmergencyProtocolStep.NotifyFamily,
  DISPATCH_SUPERVISOR: EmergencyProtocolStep.DispatchSupervisor,
  LOG_INCIDENT: EmergencyProtocolStep.LogIncident,
};

const TO_PERSISTENCE_STEP: Record<EmergencyProtocolStep, PrismaStep> = {
  [EmergencyProtocolStep.SosConfirmation]: 'SOS_CONFIRMATION',
  [EmergencyProtocolStep.AssessVisit]: 'ASSESS_VISIT',
  [EmergencyProtocolStep.NotifyFamily]: 'NOTIFY_FAMILY',
  [EmergencyProtocolStep.DispatchSupervisor]: 'DISPATCH_SUPERVISOR',
  [EmergencyProtocolStep.LogIncident]: 'LOG_INCIDENT',
};

const TO_DOMAIN_KIND: Record<PrismaKind, SosResponseEventKind> = {
  CALLBACK: SosResponseEventKind.Callback,
  GEOFENCE_CHECK: SosResponseEventKind.GeofenceCheck,
  INCIDENT_LOGGED: SosResponseEventKind.IncidentLogged,
  NOTE: SosResponseEventKind.Note,
};

const TO_PERSISTENCE_KIND: Record<SosResponseEventKind, PrismaKind> = {
  [SosResponseEventKind.Callback]: 'CALLBACK',
  [SosResponseEventKind.GeofenceCheck]: 'GEOFENCE_CHECK',
  [SosResponseEventKind.IncidentLogged]: 'INCIDENT_LOGGED',
  [SosResponseEventKind.Note]: 'NOTE',
};

/** Translates the SOS protocol completion and response event rows to and from the domain. */
export class EmergencyResponseMapper {
  static completionToDomain(row: PrismaCompletion): SosProtocolCompletion {
    return SosProtocolCompletion.rehydrate(row.id, {
      sosAlertId: row.sosAlertId,
      step: TO_DOMAIN_STEP[row.step],
      completedAt: row.completedAt,
      completedByAdminId: row.completedByAdminId,
    });
  }

  static stepToPersistence(step: EmergencyProtocolStep): PrismaStep {
    return TO_PERSISTENCE_STEP[step];
  }

  static eventToDomain(row: PrismaEvent): SosResponseEvent {
    return SosResponseEvent.rehydrate(row.id, {
      sosAlertId: row.sosAlertId,
      at: row.at,
      kind: TO_DOMAIN_KIND[row.kind],
      description: row.description,
      actorAdminId: row.actorAdminId,
      linkedIncidentId: row.linkedIncidentId,
    });
  }

  static kindToPersistence(kind: SosResponseEventKind): PrismaKind {
    return TO_PERSISTENCE_KIND[kind];
  }
}
