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
          clientId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          latitude: 37.3861,
          longitude: -122.0839,
          mode: LocationMode.Navigation,
          recordedAt: '2026-07-12T09:12:00.000Z',
          accuracyMeters: 8,
          visitId: '11111111-1111-1111-1111-111111111111',
        },
        {
          clientId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
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

  it('tags emergency points with the SOS alert they are streamed for', async () => {
    const result = await useCase.execute({
      caregiverId: 'caregiver-1',
      points: [
        {
          clientId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          latitude: 37.3861,
          longitude: -122.0839,
          mode: LocationMode.Emergency,
          recordedAt: '2026-07-12T09:12:00.000Z',
          sosAlertId: '22222222-2222-2222-2222-222222222222',
        },
      ],
    });

    expect(result.accepted).toBe(1);
    expect(repo.saved[0].mode).toBe(LocationMode.Emergency);
    expect(repo.saved[0].sosAlertId).toBe('22222222-2222-2222-2222-222222222222');
  });

  it('rejects a batch containing an out of range coordinate', async () => {
    await expect(
      useCase.execute({
        caregiverId: 'caregiver-1',
        points: [
          {
            clientId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
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

  it('is idempotent: re-pushing points with the same client ids stores them once', async () => {
    const batch = {
      caregiverId: 'caregiver-1',
      points: [
        {
          clientId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          latitude: 37.3861,
          longitude: -122.0839,
          mode: LocationMode.Background,
          recordedAt: '2026-07-12T09:12:00.000Z',
        },
        {
          clientId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          latitude: 37.3871,
          longitude: -122.084,
          mode: LocationMode.Background,
          recordedAt: '2026-07-12T09:14:00.000Z',
        },
      ],
    };

    const first = await useCase.execute(batch);
    expect(first.accepted).toBe(2);

    // A replay of the same batch stores nothing new.
    const replay = await useCase.execute(batch);
    expect(replay.accepted).toBe(0);
    expect(repo.saved).toHaveLength(2);

    // A batch mixing one seen and one new point stores only the new one.
    const mixed = await useCase.execute({
      caregiverId: 'caregiver-1',
      points: [
        batch.points[0],
        {
          clientId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
          latitude: 37.3881,
          longitude: -122.085,
          mode: LocationMode.Background,
          recordedAt: '2026-07-12T09:16:00.000Z',
        },
      ],
    });
    expect(mixed.accepted).toBe(1);
    expect(repo.saved).toHaveLength(3);
  });

  it('scopes idempotency to the caregiver: the same client id for another caregiver is stored', async () => {
    const point = {
      clientId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      latitude: 37.3861,
      longitude: -122.0839,
      mode: LocationMode.Background,
      recordedAt: '2026-07-12T09:12:00.000Z',
    };
    await useCase.execute({ caregiverId: 'caregiver-1', points: [point] });
    const other = await useCase.execute({ caregiverId: 'caregiver-2', points: [point] });

    expect(other.accepted).toBe(1);
    expect(repo.saved).toHaveLength(2);
  });
});
