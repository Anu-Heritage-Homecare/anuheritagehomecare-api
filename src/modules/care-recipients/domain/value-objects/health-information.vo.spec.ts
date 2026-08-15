import { ValidationException } from '@shared/domain/domain-exception';
import { HealthInformation } from './health-information.vo';

describe('HealthInformation', () => {
  it('cleans blank entries and preserves the rest', () => {
    const health = HealthInformation.create({
      medicalConditions: ['Hypertension', '  ', 'Diabetes'],
      allergies: [],
      needsMedicationHelp: true,
      medications: ['Metformin 500mg'],
    });

    expect(health.medicalConditions).toEqual(['Hypertension', 'Diabetes']);
    expect(health.needsMedicationHelp).toBe(true);
    expect(health.medications).toEqual(['Metformin 500mg']);
  });

  it('rejects medications when no medication help is needed', () => {
    expect(() =>
      HealthInformation.create({
        needsMedicationHelp: false,
        medications: ['Metformin 500mg'],
      }),
    ).toThrow(ValidationException);
  });

  it('defaults omitted lists to empty', () => {
    const health = HealthInformation.create({ needsMedicationHelp: false });

    expect(health.medicalConditions).toEqual([]);
    expect(health.allergies).toEqual([]);
    expect(health.medications).toEqual([]);
  });
});
