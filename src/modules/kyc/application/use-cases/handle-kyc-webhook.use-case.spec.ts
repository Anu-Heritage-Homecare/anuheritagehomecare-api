import { KycProvider } from '../../domain/kyc-provider.enum';
import { KycStatus } from '../../domain/kyc-status.enum';
import { KycVerification } from '../../domain/kyc-verification.entity';
import {
  FIXED_NOW,
  FakeKycWebhookGateway,
  InMemoryKycRepository,
  fixedClock,
} from '../../test-support/doubles';
import { HandleKycWebhookUseCase } from './handle-kyc-webhook.use-case';

describe('HandleKycWebhookUseCase', () => {
  let repo: InMemoryKycRepository;
  let useCase: HandleKycWebhookUseCase;

  beforeEach(async () => {
    repo = new InMemoryKycRepository();
    useCase = new HandleKycWebhookUseCase(repo, new FakeKycWebhookGateway(), fixedClock);

    const pending = KycVerification.start({
      id: 'kyc-1',
      ownerId: 'owner-1',
      country: 'US',
      provider: KycProvider.Stripe,
      documentType: null,
      claimed: { firstName: 'Ada', lastName: 'Obi', dateOfBirth: new Date('1988-01-02') },
      now: FIXED_NOW,
    });
    pending.recordProviderReference('vs_123');
    await repo.save(pending);
  });

  const body = (extra: Record<string, unknown>): string =>
    JSON.stringify({ providerReference: 'vs_123', ...extra });

  it('verifies when the extracted identity matches the claimed details', async () => {
    await useCase.execute({
      provider: KycProvider.Stripe,
      rawBody: body({
        state: 'verified',
        faceMatch: 'MATCH',
        identity: { firstName: 'Ada', lastName: 'Obi', dateOfBirth: '1988-01-02' },
      }),
      signature: 'valid',
    });

    expect((await repo.findByOwner('owner-1'))?.status).toBe(KycStatus.Verified);
  });

  it('rejects and records the difference when the extracted identity differs', async () => {
    await useCase.execute({
      provider: KycProvider.Stripe,
      rawBody: body({
        state: 'verified',
        faceMatch: 'MATCH',
        identity: { firstName: 'Ada', lastName: 'Obi', dateOfBirth: '1979-01-02' },
      }),
      signature: 'valid',
    });

    const stored = await repo.findByOwner('owner-1');
    expect(stored?.status).toBe(KycStatus.Rejected);
    expect(stored?.mismatches.map((m) => m.field)).toEqual(['dateOfBirth']);
  });

  it('fails the verification on a requires_input outcome', async () => {
    await useCase.execute({
      provider: KycProvider.Stripe,
      rawBody: body({ state: 'failed' }),
      signature: 'valid',
    });

    expect((await repo.findByOwner('owner-1'))?.status).toBe(KycStatus.Failed);
  });

  it('rejects a webhook with a bad signature', async () => {
    await expect(
      useCase.execute({
        provider: KycProvider.Stripe,
        rawBody: body({ state: 'verified' }),
        signature: 'bad',
      }),
    ).rejects.toThrow();
    expect((await repo.findByOwner('owner-1'))?.status).toBe(KycStatus.Pending);
  });

  it('ignores an unknown provider reference', async () => {
    await useCase.execute({
      provider: KycProvider.Stripe,
      rawBody: JSON.stringify({ providerReference: 'vs_other', state: 'verified' }),
      signature: 'valid',
    });

    expect((await repo.findByOwner('owner-1'))?.status).toBe(KycStatus.Pending);
  });
});
