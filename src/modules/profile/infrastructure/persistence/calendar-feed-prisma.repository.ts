import { Injectable } from '@nestjs/common';
import { CalendarFeed as PrismaCalendarFeed } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CalendarFeed } from '../../domain/calendar-feed.entity';
import { CalendarFeedRepository } from '../../domain/calendar-feed.repository';

/** Prisma backed adapter for the CalendarFeedRepository port. */
@Injectable()
export class CalendarFeedPrismaRepository implements CalendarFeedRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(feed: CalendarFeed): Promise<void> {
    const data = { token: feed.token, createdAt: feed.createdAt };
    await this.prisma.calendarFeed.upsert({
      where: { userId: feed.userId },
      create: { userId: feed.userId, ...data },
      update: data,
    });
  }

  async findByUserId(userId: string): Promise<CalendarFeed | null> {
    const row = await this.prisma.calendarFeed.findUnique({ where: { userId } });
    return row ? CalendarFeedPrismaRepository.toDomain(row) : null;
  }

  async findByToken(token: string): Promise<CalendarFeed | null> {
    const row = await this.prisma.calendarFeed.findUnique({ where: { token } });
    return row ? CalendarFeedPrismaRepository.toDomain(row) : null;
  }

  private static toDomain(row: PrismaCalendarFeed): CalendarFeed {
    return CalendarFeed.rehydrate(row.userId, { token: row.token, createdAt: row.createdAt });
  }
}
