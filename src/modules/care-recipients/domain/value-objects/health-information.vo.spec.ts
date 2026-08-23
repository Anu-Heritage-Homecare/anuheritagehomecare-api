import { HealthInformation } from './health-information.vo';

describe('HealthInformation', () => {
  it('cleans blank entries and preserves the rest', () => {
    const health = HealthInformation.create({
      medicalConditions: ['Hypertension', '  ', 'Diabetes'],
      allergies: [],
      needsMedicationHelp: true,
    });

    expect(health.medicalConditions).toEqual(['Hypertension', 'Diabetes']);
    expect(health.needsMedicationHelp).toBe(true);
  });

  it('defaults omitted lists to empty', () => {
    const health = HealthInformation.create({ needsMedicationHelp: false });

    expect(health.medicalConditions).toEqual([]);
    expect(health.allergies).toEqual([]);
  });
});
