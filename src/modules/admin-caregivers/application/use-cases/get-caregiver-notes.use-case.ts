import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  CAREGIVER_READ_MODEL,
  CaregiverNoteView,
  CaregiverReadModel,
} from '../ports/caregiver-read.port';
import { CaregiverNoteEntryResult, CaregiverNotesTabResult } from '../dto/caregiver-notes.result';

const DAY_MS = 86_400_000;
const TYPE_LABELS: Record<string, string> = {
  VISIT: 'Visit Note',
  SUPERVISOR: 'Supervisor Note',
  INTERNAL: 'Internal',
  TRAINING: 'Training',
};

export interface GetCaregiverNotesCommand {
  profileId: string;
  type: string | null;
  search: string | null;
  from: Date | null;
  to: Date | null;
  page: number;
  pageSize: number;
}

/**
 * The caregiver Notes tab: the headline counts and a merged, filtered and paginated
 * feed of the caregiver's own Visit Notes (from the visits context) and the office
 * written supervisor, internal and training notes. Read only.
 */
@Injectable()
export class GetCaregiverNotesUseCase {
  constructor(
    @Inject(CAREGIVER_READ_MODEL) private readonly reads: CaregiverReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetCaregiverNotesCommand): Promise<CaregiverNotesTabResult> {
    const now = this.clock.now();
    const fromStart = startOfUtcDay(command.from ?? startOfUtcMonth(now));
    const toInclusive = command.to ?? now;
    const toExclusive = new Date(startOfUtcDay(toInclusive).getTime() + DAY_MS);

    const view = await this.reads.notesTab(command.profileId, fromStart, toExclusive, now);
    if (view === null) {
      throw new NotFoundDomainException('Caregiver not found');
    }

    const search = command.search === null ? null : command.search.trim().toLowerCase();
    const filtered = view.notes
      .filter((n) => (command.type === null ? true : n.type === command.type))
      .filter((n) => this.matchesSearch(n, search))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const start = Math.max(0, (command.page - 1) * command.pageSize);
    const rows = filtered.slice(start, start + command.pageSize).map((n) => this.toEntry(n));

    return {
      counts: view.counts,
      range: {
        from: fromStart.toISOString(),
        to: new Date(toExclusive.getTime() - DAY_MS).toISOString(),
      },
      notes: { total: filtered.length, page: command.page, pageSize: command.pageSize, rows },
    };
  }

  private matchesSearch(note: CaregiverNoteView, search: string | null): boolean {
    if (search === null || search.length === 0) {
      return true;
    }
    return `${note.text} ${note.authorName}`.toLowerCase().includes(search);
  }

  private toEntry(note: CaregiverNoteView): CaregiverNoteEntryResult {
    return {
      id: note.id,
      type: note.type,
      typeLabel: TYPE_LABELS[note.type] ?? note.type,
      authorName: note.authorName,
      authorRole: note.authorRole,
      bySelf: note.bySelf,
      text: note.text,
      date: note.createdAt.toISOString(),
    };
  }
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function startOfUtcMonth(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}
