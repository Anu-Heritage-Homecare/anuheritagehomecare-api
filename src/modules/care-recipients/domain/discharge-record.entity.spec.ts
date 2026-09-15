import { ValidationException } from '@shared/domain/domain-exception';
import { ALL_DISCHARGE_ACKNOWLEDGEMENTS } from './discharge-acknowledgement.enum';
import { DischargeAction } from './discharge-action.enum';
import { DischargeReason } from './discharge-reason.enum';
import { DischargeRecordStatus } from './discharge-record-status.enum';
import { DischargeRecord } from './discharge-record.entity';

const NOW = new Date('2026-07-24T00:00:00.000Z');
const EFFECTIVE = new Date('2026-07-30T00:00:00.000Z');

function draft(
  fields: Partial<Parameters<typeof DischargeRecord.draft>[0]['fields']> = {},
): DischargeRecord {
  return DischargeRecord.draft({
    id: 'd1',
    careRecipientId: 'r1',
    fields: { action: DischargeAction.Discharge, ...fields },
    now: NOW,
  });
}

describe('DischargeRecord', () => {
  it('starts as a draft with the given fields', () => {
    const record = draft({ reason: DischargeReason.CareNoLongerNeeded });
    expect(record.status).toBe(DischargeRecordStatus.Draft);
    expect(record.reason).toBe(DischargeReason.CareNoLongerNeeded);
    expect(record.processedAt).toBeNull();
  });

  it('deduplicates acknowledgements and trims the summary', () => {
    const record = draft({
      acknowledgements: [...ALL_DISCHARGE_ACKNOWLEDGEMENTS, ...ALL_DISCHARGE_ACKNOWLEDGEMENTS],
      clinicalSummary: '  transitioned to family care  ',
    });
    expect(record.acknowledgements).toHaveLength(ALL_DISCHARGE_ACKNOWLEDGEMENTS.length);
    expect(record.clinicalSummary).toBe('transitioned to family care');
  });

  it('rejects processing a discharge missing the reason, date, summary or acknowledgements', () => {
    expect(() => draft({}).process('admin1', NOW)).toThrow(ValidationException);
    expect(() =>
      draft({ reason: DischargeReason.CareNoLongerNeeded }).process('admin1', NOW),
    ).toThrow(ValidationException);
    expect(() =>
      draft({
        reason: DischargeReason.CareNoLongerNeeded,
        effectiveDate: EFFECTIVE,
        clinicalSummary: 'done',
        acknowledgements: ALL_DISCHARGE_ACKNOWLEDGEMENTS.slice(0, 3),
      }).process('admin1', NOW),
    ).toThrow(ValidationException);
  });

  it('processes a complete discharge and becomes immutable', () => {
    const record = draft({
      reason: DischargeReason.CareNoLongerNeeded,
      effectiveDate: EFFECTIVE,
      clinicalSummary: 'Transitioned successfully to full-time family care.',
      acknowledgements: [...ALL_DISCHARGE_ACKNOWLEDGEMENTS],
    });
    record.process('admin1', NOW);
    expect(record.status).toBe(DischargeRecordStatus.Processed);
    expect(record.processedByAdminId).toBe('admin1');
    expect(record.processedAt).toEqual(NOW);
    expect(() => record.revise({ action: DischargeAction.Discharge }, NOW)).toThrow(
      ValidationException,
    );
    expect(() => record.process('admin1', NOW)).toThrow(ValidationException);
  });

  it('processes a hold with only a reason and effective date', () => {
    const record = draft({
      action: DischargeAction.Hold,
      reason: DischargeReason.Hospitalization,
      effectiveDate: EFFECTIVE,
    });
    record.process('admin1', NOW);
    expect(record.status).toBe(DischargeRecordStatus.Processed);
  });
});
