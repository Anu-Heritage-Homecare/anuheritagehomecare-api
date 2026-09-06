import { ApiProperty } from '@nestjs/swagger';
import { CalendarFeedView } from '../../application/use-cases/calendar-feed.use-cases';

/** HTTP response carrying the owner's private calendar feed URL. */
export class CalendarFeedResponseDto {
  @ApiProperty({ example: 'https://api.example.com/api/v1/family/calendar/abc123.ics' })
  url!: string;

  static fromView(view: CalendarFeedView): CalendarFeedResponseDto {
    return Object.assign(new CalendarFeedResponseDto(), view);
  }
}
