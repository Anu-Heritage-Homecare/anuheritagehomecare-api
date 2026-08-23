import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { SosAlertStatus } from '../../domain/sos-alert-status.enum';
import { VisitStatus } from '../../domain/visit-status.enum';
import {
  FakeCareRecipientDirectory,
  InMemorySosAlertRepository,
  InMemoryVisitRepository,
  buildSnapshot,
  buildVisit,
  fixedClock,
  sequentialIds,
} from '../../test-support/doubles';
import { CancelSosUseCase } from './cancel-sos.use-case';
import { RaiseSosUseCase } from './raise-sos.use-case';

describe('SOS alerts', () => {
  let visits: InMemoryVisitRepository;
  let alerts: InMemorySosAlertRepository;
  let recipients: FakeCareRecipientDirectory;
  let raise: RaiseSosUseCase;
  let cancel: CancelSosUseCase;

  beforeEach(() => {
    visits = new InMemoryVisitRepository();
    alerts = new InMemorySosAlertRepository();
    recipients = new FakeCareRecipientDirectory();
    recipients.add(buildSnapshot());
    raise = new RaiseSosUseCase(visits, alerts, recipients, fixedClock, sequentialIds('sos'));
    cancel = new CancelSosUseCase(alerts, fixedClock);
  });

  it('captures the caregiver position and a recipient snapshot', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));

    const result = await raise.execute({
      caregiverId: 'caregiver-1',
      visitId: 'v1',
      latitude: 37.3861,
      longitude: -122.0839,
    });

    expect(result.id).toBe('sos-1');
    expect(result.status).toBe(SosAlertStatus.Active);
    expect(result.recipient).toEqual({
      careRecipientId: 'recipient-1',
      name: 'Eleanor Ross',
      address: '123 Maple Street, Sunnyvale, CA 94086',
    });

    const stored = alerts.all[0];
    expect(stored.position?.latitude).toBe(37.3861);
    expect(stored.recipient.location?.latitude).toBe(37.3861);
  });

  it('still raises without a caregiver position (best effort)', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));

    const result = await raise.execute({ caregiverId: 'caregiver-1', visitId: 'v1' });

    expect(result.status).toBe(SosAlertStatus.Active);
    expect(alerts.all[0].position).toBeNull();
  });

  it('still raises when the recipient lookup finds nothing', async () => {
    await visits.save(
      buildVisit({ id: 'v1', careRecipientId: 'ghost', status: VisitStatus.InProgress }),
    );

    const result = await raise.execute({
      caregiverId: 'caregiver-1',
      visitId: 'v1',
      latitude: 37.3861,
      longitude: -122.0839,
    });

    expect(result.recipient).toEqual({
      careRecipientId: 'ghost',
      name: null,
      address: null,
    });
  });

  it('hides a visit that belongs to another caregiver', async () => {
    await visits.save(buildVisit({ id: 'v1', caregiverId: 'caregiver-2' }));

    await expect(
      raise.execute({
        caregiverId: 'caregiver-1',
        visitId: 'v1',
        latitude: 37.3861,
        longitude: -122.0839,
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
    expect(alerts.all).toHaveLength(0);
  });

  it('cancels an alert the caregiver raised', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));
    const raised = await raise.execute({
      caregiverId: 'caregiver-1',
      visitId: 'v1',
      latitude: 37.3861,
      longitude: -122.0839,
    });

    const result = await cancel.execute({
      caregiverId: 'caregiver-1',
      visitId: 'v1',
      alertId: raised.id,
    });

    expect(result.status).toBe(SosAlertStatus.Cancelled);
    expect(result.cancelledAt).not.toBeNull();
  });

  it('refuses to cancel another caregiver alert', async () => {
    await visits.save(buildVisit({ id: 'v1', status: VisitStatus.InProgress }));
    const raised = await raise.execute({
      caregiverId: 'caregiver-1',
      visitId: 'v1',
      latitude: 37.3861,
      longitude: -122.0839,
    });

    await expect(
      cancel.execute({ caregiverId: 'intruder', visitId: 'v1', alertId: raised.id }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
