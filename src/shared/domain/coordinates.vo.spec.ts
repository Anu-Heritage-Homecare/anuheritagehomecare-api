import { ValidationException } from './domain-exception';
import { Coordinates } from './coordinates.vo';

describe('Coordinates', () => {
  it('rejects out of range values', () => {
    expect(() => Coordinates.create(91, 0)).toThrow(ValidationException);
    expect(() => Coordinates.create(0, 200)).toThrow(ValidationException);
    expect(() => Coordinates.create(Number.NaN, 0)).toThrow(ValidationException);
  });

  it('measures a short distance and answers the geofence question', () => {
    // Two points roughly 111 metres apart (0.001 degrees of latitude).
    const address = Coordinates.create(37.3861, -122.0839);
    const nearby = Coordinates.create(37.3871, -122.0839);

    const distance = address.distanceToMeters(nearby);
    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(120);

    expect(address.isWithinMeters(nearby, 150)).toBe(true);
    expect(address.isWithinMeters(nearby, 50)).toBe(false);
  });

  it('treats an identical point as within any radius', () => {
    const point = Coordinates.create(6.5244, 3.3792);
    expect(point.distanceToMeters(point)).toBe(0);
    expect(point.isWithinMeters(point, 0)).toBe(true);
  });
});
