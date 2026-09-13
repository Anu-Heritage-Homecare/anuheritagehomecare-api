import { ValidationException } from '@shared/domain/domain-exception';
import { HealthEvent } from './health-event.entity';
import { HealthEventCategory } from './health-event-category.enum';

const NOW = new Date('2026-07-24T00:00:00.000Z');

describe('HealthEvent', () => {
  it('records an event, trimming the reporter fields', () => {
    const event = HealthEvent.record({
      id: 'e1',
      careRecipientId: 'r1',
      category: HealthEventCategory.Vitals,
      title: '  Vitals Recorded ',
      description: 'BP 128/82, HR 72',
      recordedByName: '  Sarah Williams ',
      recordedByRole: '   ',
      occurredAt: NOW,
      authorAdminId: 'admin-1',
      now: NOW,
    });
    expect(event.title).toBe('Vitals Recorded');
    expect(event.recordedByName).toBe('Sarah Williams');
    expect(event.recordedByRole).toBeNull();
    expect(event.category).toBe(HealthEventCategory.Vitals);
    expect(event.authorAdminId).toBe('admin-1');
  });

  it('allows a future occurredAt for a scheduled appointment', () => {
    const event = HealthEvent.record({
      id: 'e1',
      careRecipientId: 'r1',
      category: HealthEventCategory.Appointment,
      title: 'Quarterly Review',
      description: 'With Dr. Kim',
      occurredAt: new Date('2026-11-05T00:00:00.000Z'),
      now: NOW,
    });
    expect(event.occurredAt.toISOString()).toBe('2026-11-05T00:00:00.000Z');
  });

  it('rejects a blank title', () => {
    expect(() =>
      HealthEvent.record({
        id: 'e1',
        careRecipientId: 'r1',
        category: HealthEventCategory.Care,
        title: '   ',
        description: 'x',
        occurredAt: NOW,
        now: NOW,
      }),
    ).toThrow(ValidationException);
  });
});
