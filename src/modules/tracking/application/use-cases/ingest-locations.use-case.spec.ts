import { ValidationException } from '@shared/domain/domain-exception';
import { LocationMode } from '../../domain/location-mode.enum';
import {
  FIXED_NOW,
  InMemoryLocationPingRepository,
  fixedClock,
  sequentialIds,
} from '../../test-support/doubles';
import { IngestLocationsUseCase } from './ingest-locations.use-case';

describe('IngestLocationsUseCase', () => {
  let repo: InMemoryLocationPingRepository;
  let useCase: IngestLocationsUseCase;

  beforeEach(() => {
    repo = new InMemoryLocationPingRepository();
    useCase = new IngestLocationsUseCase(repo, fixedClock, sequentialIds());
  });

  it('stores a batch of points stamped with the server receive time', async () => {
    const result = await useCase.execute({
      caregiverId: 'caregiver-1',
      points: [
        {
          latitude: 37.3861,
          longitude: -122.0839,
          mode: LocationMode.Navigation,
          recordedAt: '2026-07-12T09:12:00.000Z',
          accuracyMeters: 8,
          visitId: '11111111-1111-1111-1111-111111111111',
        },
        {
          latitude: 37.3871,
          longitude: -122.084,
          mode: LocationMode.Background,
          recordedAt: '2026-07-12T09:14:00.000Z',
        },
      ],
    });

    expect(result.accepted).toBe(2);
    expect(repo.saved).toHaveLength(2);
    expect(repo.saved[0].caregiverId).toBe('caregiver-1');
    expect(repo.saved[0].mode).toBe(LocationMode.Navigation);
    expect(repo.saved[0].receivedAt).toEqual(FIXED_NOW);
    expect(repo.saved[0].position.latitude).toBe(37.3861);
    expect(repo.saved[1].visitId).toBeNull();
    expect(repo.saved[1].accuracyMeters).toBeNull();
  });

  it('rejects a batch containing an out of range coordinate', async () => {
    await expect(
      useCase.execute({
        caregiverId: 'caregiver-1',
        points: [
          {
            latitude: 999,
            longitude: 0,
            mode: LocationMode.Navigation,
            recordedAt: '2026-07-12T09:12:00.000Z',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(repo.saved).toHaveLength(0);
  });
});
