import { KycDocumentType } from '../../domain/kyc-document-type.enum';
import { KycProvider } from '../../domain/kyc-provider.enum';
import { KycStatus } from '../../domain/kyc-status.enum';
import { KycVerification } from '../../domain/kyc-verification.entity';
import {
  FakeKycWebhookGateway,
  FIXED_NOW,
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
      documentType: KycDocumentType.SsnLast4,
      maskedReference: '6789',
      now: FIXED_NOW,
    });
    pending.recordProviderReference('vs_123');
    await repo.save(pending);
  });

  const body = (outcome: string): string =>
    JSON.stringify({ providerReference: 'vs_123', outcome });

  it('verifies the owner on a verified session', async () => {
    await useCase.execute({
      provider: KycProvider.Stripe,
      rawBody: body('verified'),
      signature: 'valid',
    });

    expect((await repo.findByOwner('owner-1'))?.status).toBe(KycStatus.Verified);
  });

  it('rejects a webhook with a bad signature', async () => {
    await expect(
      useCase.execute({
        provider: KycProvider.Stripe,
        rawBody: body('verified'),
        signature: 'bad',
      }),
    ).rejects.toThrow();
    expect((await repo.findByOwner('owner-1'))?.status).toBe(KycStatus.Pending);
  });

  it('ignores an unknown provider reference', async () => {
    await useCase.execute({
      provider: KycProvider.Stripe,
      rawBody: JSON.stringify({ providerReference: 'vs_other', outcome: 'verified' }),
      signature: 'valid',
    });

    expect((await repo.findByOwner('owner-1'))?.status).toBe(KycStatus.Pending);
  });
});
