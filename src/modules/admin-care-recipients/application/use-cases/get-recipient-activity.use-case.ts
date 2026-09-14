import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  ActivityCategory,
  ActivityEventView,
  RECIPIENT_ACTIVITY_READ_MODEL,
  RecipientActivityReadModel,
} from '../ports/recipient-activity-read.port';
import { ActivityItemResult, RecipientActivityResult } from '../dto/recipient-activity.result';

const MS_PER_DAY = 86_400_000;
const MAX_WINDOW_DAYS = 365;

export interface GetRecipientActivityQuery {
  recipientId: string;
  category: ActivityCategory | null;
  user: string | null;
  search: string | null;
  days: number;
  page: number;
  pageSize: number;
}

/**
 * Use case: assemble one recipient's Activity tab (the System Audit Trail). Reads the
 * composed event feed within the chosen window, derives the distinct performer list for
 * the User filter, then applies the category, user and search filters and paginates.
 * The feed is newest first. The window is capped so a wide range cannot read unbounded.
 */
@Injectable()
export class GetRecipientActivityUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(RECIPIENT_ACTIVITY_READ_MODEL) private readonly readModel: RecipientActivityReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: GetRecipientActivityQuery): Promise<RecipientActivityResult> {
    if ((await this.recipients.findById(query.recipientId)) === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const windowDays = Math.min(Math.max(1, query.days), MAX_WINDOW_DAYS);
    const since = new Date(this.clock.now().getTime() - windowDays * MS_PER_DAY);
    const events = await this.readModel.listSince(query.recipientId, since);

    // The dropdown lists everyone active in the window, before the user filter narrows it.
    const users = [
      ...new Set(
        events
          .map((event) => event.performedByName)
          .filter((name): name is string => name !== null),
      ),
    ].sort((a, b) => a.localeCompare(b));

    const filtered = events.filter((event) => this.matches(event, query));
    const total = filtered.length;
    const totalPages = query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0;
    const start = Math.max(0, (query.page - 1) * query.pageSize);
    const items = filtered.slice(start, start + query.pageSize).map((event) => this.toItem(event));

    return {
      windowDays,
      users,
      page: { items, page: query.page, pageSize: query.pageSize, total, totalPages },
    };
  }

  private matches(event: ActivityEventView, query: GetRecipientActivityQuery): boolean {
    if (query.category !== null && event.category !== query.category) {
      return false;
    }
    if (query.user !== null && event.performedByName !== query.user) {
      return false;
    }
    const search = query.search?.trim().toLowerCase();
    if (search) {
      const haystack = `${event.title} ${event.description}`.toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
  }

  private toItem(event: ActivityEventView): ActivityItemResult {
    return {
      id: event.id,
      occurredAt: event.occurredAt,
      category: event.category,
      type: event.type,
      title: event.title,
      description: event.description,
      performedByName: event.performedByName,
      performedByRole: event.performedByRole,
    };
  }
}
