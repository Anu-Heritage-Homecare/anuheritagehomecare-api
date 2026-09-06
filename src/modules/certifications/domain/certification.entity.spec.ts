import { ValidationException } from '@shared/domain/domain-exception';
import { Certification } from './certification.entity';

const NOW = new Date('2026-09-06T00:00:00.000Z');

describe('Certification', () => {
  it('computes whole days until expiry, negative once expired', () => {
    const cert = Certification.record({
      id: 'c1',
      caregiverId: 'caregiver-1',
      name: 'CPR',
      expiresAt: new Date('2026-09-09T00:00:00.000Z'),
      now: NOW,
    });
    expect(cert.daysUntilExpiry(NOW)).toBe(3);
    expect(cert.daysUntilExpiry(new Date('2026-09-11T00:00:00.000Z'))).toBe(-2);
  });

  it('rejects a blank name', () => {
    expect(() =>
      Certification.record({
        id: 'c1',
        caregiverId: 'caregiver-1',
        name: '   ',
        expiresAt: NOW,
        now: NOW,
      }),
    ).toThrow(ValidationException);
  });
});
