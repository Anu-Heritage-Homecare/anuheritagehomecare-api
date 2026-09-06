import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { GetCalendarIcsUseCase } from '../application/use-cases/calendar-feed.use-cases';

/**
 * Public, unauthenticated calendar feed. A calendar app subscribes to this URL
 * and can only present the token in the path (it cannot send a bearer header), so
 * the token is the capability. Read only; the ICS exposes only the schedule.
 */
@ApiExcludeController()
@Controller({ path: 'family/calendar', version: '1' })
export class CalendarFeedController {
  constructor(private readonly getIcs: GetCalendarIcsUseCase) {}

  @Get(':token')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  async feed(@Param('token') raw: string): Promise<string> {
    const token = raw.endsWith('.ics') ? raw.slice(0, -'.ics'.length) : raw;
    return this.getIcs.execute({ token });
  }
}
