import { Coordinates } from '@shared/domain/coordinates.vo';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { SosAlert } from '@modules/visits/domain/sos-alert.entity';
import { InMemorySosAlertRepository } from '@modules/visits/test-support/doubles';
import { DispatchSosUseCase } from './dispatch-sos.use-case';

const NOW = new Date('2026-07-24T16:50:00.000Z');
const clock = { now: () => NOW };

function alert(id: string): SosAlert {
  return SosAlert.raise({
    id,
    caregiverId: 'cg-1',
    visitId: 'v-1',
    position: Coordinates.create(40, -89),
    recipient: { careRecipientId: 'r-1', name: 'Recipient', address: null, location: null },
    now: new Date('2026-07-24T16:35:00.000Z'),
  });
}

describe('DispatchSosUseCase', () => {
  it('records the dispatch time and keeps the alert active', async () => {
    const alerts = new InMemorySosAlertRepository();
    await alerts.save(alert('sos1'));
    const result = await new DispatchSosUseCase(alerts, clock).execute('sos1');
    expect(result.dispatchedAt).toEqual(NOW);
    const saved = await alerts.findById('sos1');
    expect(saved?.dispatchedAt).toEqual(NOW);
    expect(saved?.status).toBe('ACTIVE');
  });

  it('rejects an unknown alert', async () => {
    await expect(
      new DispatchSosUseCase(new InMemorySosAlertRepository(), clock).execute('nope'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
