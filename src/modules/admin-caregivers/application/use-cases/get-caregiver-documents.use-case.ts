import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  CAREGIVER_READ_MODEL,
  CaregiverCredentialView,
  CaregiverDocumentRowView,
  CaregiverReadModel,
  CaregiverTrainingRowView,
} from '../ports/caregiver-read.port';
import {
  CaregiverComplianceSummaryResult,
  CaregiverCredentialResult,
  CaregiverDocumentUploadResult,
  CaregiverDocumentsTabResult,
  CaregiverEmploymentDocumentResult,
  CaregiverRenewalResult,
  CaregiverTrainingRecordResult,
} from '../dto/caregiver-documents.result';

const DAY_MS = 86_400_000;
const MONTH_MS = 2_629_800_000; // average month, for a renewal's months away
/** A credential expiring within this many days flags the caregiver for attention. */
const ATTENTION_DAYS = 30;
/** Renewal urgency thresholds, in months until expiry. */
const RENEWAL_REQUIRED_MONTHS = 6;
const RENEWAL_UPCOMING_MONTHS = 12;
const UPLOAD_HISTORY_LIMIT = 10;

interface GetCaregiverDocumentsCommand {
  profileId: string;
}

/**
 * The caregiver Documents tab: the compliance summary, the certifications, the
 * employment documents, the training records and the upload history. Read only;
 * the certification status and the compliance figures are derived server side from
 * the credential kinds and expiries. Files are opaque keys, so each row reports
 * only whether a document is on file, never a URL (downloads are deferred).
 */
@Injectable()
export class GetCaregiverDocumentsUseCase {
  constructor(
    @Inject(CAREGIVER_READ_MODEL) private readonly reads: CaregiverReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetCaregiverDocumentsCommand): Promise<CaregiverDocumentsTabResult> {
    const now = this.clock.now();
    const view = await this.reads.documentsTab(command.profileId);
    if (view === null) {
      throw new NotFoundDomainException('Caregiver not found');
    }

    return {
      summary: this.summary(view, now),
      certifications: view.credentials.map((c) => this.toCredential(c, now)),
      employmentDocuments: view.documents.map((d) => this.toDocument(d)),
      trainingRecords: view.trainings.map((t) => this.toTraining(t)),
      upcomingRenewals: this.upcomingRenewals(view.credentials, now),
      uploadHistory: this.uploadHistory(view),
    };
  }

  /** The credentials ordered by soonest expiry, each with a renewal urgency. */
  private upcomingRenewals(
    credentials: CaregiverCredentialView[],
    now: Date,
  ): CaregiverRenewalResult[] {
    return credentials
      .slice()
      .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime())
      .map((c) => {
        const monthsAway = Math.max(
          0,
          Math.round((c.expiresAt.getTime() - now.getTime()) / MONTH_MS),
        );
        const urgency =
          c.expiresAt.getTime() <= now.getTime() || monthsAway <= RENEWAL_REQUIRED_MONTHS
            ? 'REQUIRED'
            : monthsAway <= RENEWAL_UPCOMING_MONTHS
              ? 'UPCOMING'
              : 'VALID';
        return {
          id: c.id,
          name: c.name,
          expiresAt: c.expiresAt.toISOString(),
          monthsAway,
          urgency,
          label:
            c.expiresAt.getTime() <= now.getTime()
              ? 'Expired'
              : `${monthsAway} month${monthsAway === 1 ? '' : 's'} away`,
        };
      });
  }

  private summary(
    view: {
      credentials: CaregiverCredentialView[];
      documents: CaregiverDocumentRowView[];
      trainings: CaregiverTrainingRowView[];
    },
    now: Date,
  ): CaregiverComplianceSummaryResult {
    const credentials = view.credentials;
    const expired = credentials.filter((c) => c.expiresAt.getTime() <= now.getTime());
    const upcoming = credentials
      .filter((c) => c.expiresAt.getTime() > now.getTime())
      .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
    const soonest = upcoming[0] ?? null;
    const daysToSoonest =
      soonest === null ? null : Math.ceil((soonest.expiresAt.getTime() - now.getTime()) / DAY_MS);

    let overallStatus = 'Fully Compliant';
    if (expired.length > 0) {
      overallStatus = 'Non-compliant';
    } else if (daysToSoonest !== null && daysToSoonest <= ATTENTION_DAYS) {
      overallStatus = 'Attention';
    }

    const timestamps = [
      ...credentials.map((c) => c.createdAt.getTime()),
      ...view.documents.map((d) => d.createdAt.getTime()),
      ...view.trainings.map((t) => t.createdAt.getTime()),
    ];

    const requirementsTotal = credentials.length;
    const requirementsMet = requirementsTotal - expired.length;
    // Credentialing is good until the furthest out credential expiry.
    const furthest =
      credentials.length === 0
        ? null
        : new Date(Math.max(...credentials.map((c) => c.expiresAt.getTime())));

    return {
      overallStatus,
      message: complianceMessage(requirementsMet, requirementsTotal, expired.length, furthest),
      requirementsMet,
      requirementsTotal,
      credentialingValidUntil: furthest === null ? null : furthest.toISOString(),
      nextImpendingExpiry:
        soonest === null || daysToSoonest === null
          ? null
          : {
              name: soonest.name,
              expiresAt: soonest.expiresAt.toISOString(),
              daysRemaining: daysToSoonest,
            },
      documentsOnFile: credentials.length + view.documents.length + view.trainings.length,
      lastUpdated: timestamps.length === 0 ? null : new Date(Math.max(...timestamps)).toISOString(),
    };
  }

  private toCredential(view: CaregiverCredentialView, now: Date): CaregiverCredentialResult {
    return {
      id: view.id,
      name: view.name,
      kind: view.kind,
      licenseNumber: view.licenseNumber,
      issued: view.issuedAt === null ? null : view.issuedAt.toISOString(),
      expires: view.expiresAt.toISOString(),
      status: credentialStatus(view.kind, view.expiresAt, now),
      fileName: view.fileName,
      hasDocument: view.documentKey !== null || view.fileName !== null,
    };
  }

  private toDocument(view: CaregiverDocumentRowView): CaregiverEmploymentDocumentResult {
    return {
      id: view.id,
      name: view.name,
      category: view.category,
      status: view.status,
      date: view.documentDate === null ? null : view.documentDate.toISOString(),
      fileName: view.fileName,
      hasDocument: view.documentKey !== null || view.fileName !== null,
    };
  }

  private toTraining(view: CaregiverTrainingRowView): CaregiverTrainingRecordResult {
    const hoursLabel =
      view.status === 'IN_PROGRESS' && view.hoursRequired !== null
        ? `${view.hoursCompleted}/${view.hoursRequired}h`
        : `${view.hoursCompleted}h`;
    return {
      id: view.id,
      name: view.name,
      status: view.status,
      completed: view.completedAt === null ? null : view.completedAt.toISOString(),
      certificate: view.certificate,
      hoursLabel,
      hasCertificate: view.documentKey !== null || view.fileName !== null,
    };
  }

  private uploadHistory(view: {
    credentials: CaregiverCredentialView[];
    documents: CaregiverDocumentRowView[];
    trainings: CaregiverTrainingRowView[];
  }): CaregiverDocumentUploadResult[] {
    const entries: { at: number; item: CaregiverDocumentUploadResult }[] = [];
    const add = (
      hasFile: boolean,
      name: string,
      fileName: string | null,
      uploadedBy: string | null,
      createdAt: Date,
    ): void => {
      if (!hasFile) {
        return;
      }
      entries.push({
        at: createdAt.getTime(),
        item: { date: createdAt.toISOString(), title: name, fileName, uploadedBy },
      });
    };
    for (const c of view.credentials) {
      add(
        c.documentKey !== null || c.fileName !== null,
        c.name,
        c.fileName,
        c.uploadedBy,
        c.createdAt,
      );
    }
    for (const d of view.documents) {
      add(
        d.documentKey !== null || d.fileName !== null,
        d.name,
        d.fileName,
        d.uploadedBy,
        d.createdAt,
      );
    }
    for (const t of view.trainings) {
      add(
        t.documentKey !== null || t.fileName !== null,
        t.name,
        t.fileName,
        t.uploadedBy,
        t.createdAt,
      );
    }
    return entries
      .sort((a, b) => b.at - a.at)
      .slice(0, UPLOAD_HISTORY_LIMIT)
      .map((e) => e.item);
  }
}

/** The status label a credential shows: Expired when past due, else driven by kind. */
function credentialStatus(kind: string, expiresAt: Date, now: Date): string {
  if (expiresAt.getTime() <= now.getTime()) {
    return 'Expired';
  }
  switch (kind) {
    case 'BACKGROUND_CHECK':
      return 'Cleared';
    case 'HEALTH_SCREENING':
      return 'Current';
    default:
      return 'Valid';
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The compliance banner sentence. */
function complianceMessage(
  met: number,
  total: number,
  expiredCount: number,
  furthest: Date | null,
): string {
  if (total === 0) {
    return 'No regulatory requirements are on file.';
  }
  if (expiredCount > 0) {
    return `${met} of ${total} regulatory requirements are currently met; ${expiredCount} need renewal.`;
  }
  const until =
    furthest === null
      ? ''
      : ` Credentialing is valid until ${MONTHS[furthest.getUTCMonth()]} ${furthest.getUTCFullYear()}.`;
  return `All ${total} regulatory requirements are currently met.${until}`;
}
