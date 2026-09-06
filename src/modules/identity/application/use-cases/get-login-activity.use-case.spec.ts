import { LoginOutcome } from '../../domain/login-event.entity';
import {
  FAKE_DEVICE,
  InMemoryLoginEventRepository,
  sequentialIds,
} from '../../test-support/doubles';
import { LoginEventRecorder } from '../services/login-event-recorder.service';
import { GetLoginActivityUseCase } from './get-login-activity.use-case';

describe('GetLoginActivityUseCase', () => {
  it('returns the user recent activity, newest first, scoped to the user', async () => {
    const repo = new InMemoryLoginEventRepository();
    const recorder = new LoginEventRecorder(repo, sequentialIds('le'), {
      now: () => new Date('2026-01-01T08:00:00.000Z'),
    });
    await recorder.record('user-1', LoginOutcome.Success, FAKE_DEVICE);
    await new LoginEventRecorder(repo, sequentialIds('le2'), {
      now: () => new Date('2026-01-01T09:00:00.000Z'),
    }).record('user-1', LoginOutcome.Failure, FAKE_DEVICE);
    await recorder.record('other', LoginOutcome.Success, FAKE_DEVICE);

    const activity = await new GetLoginActivityUseCase(repo).execute({ userId: 'user-1' });

    expect(activity).toHaveLength(2);
    // Newest first: the failure at 09:00 precedes the success at 08:00.
    expect(activity[0].outcome).toBe('FAILURE');
    expect(activity[1].outcome).toBe('SUCCESS');
    expect(activity[0].deviceLabel).toBe(FAKE_DEVICE.deviceLabel);
  });

  it('is empty for a user with no history', async () => {
    const activity = await new GetLoginActivityUseCase(new InMemoryLoginEventRepository()).execute({
      userId: 'nobody',
    });
    expect(activity).toEqual([]);
  });
});
