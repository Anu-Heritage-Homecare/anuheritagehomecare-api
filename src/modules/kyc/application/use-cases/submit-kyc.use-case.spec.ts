import { ValidationException } from '@shared/domain/domain-exception';
import { FaceMatchOutcome } from '../../domain/face-match-outcome.enum';
import { KycProvider } from '../../domain/kyc-provider.enum';
import { KycStatus } from '../../domain/kyc-status.enum';
import { KycVerification } from '../../domain/kyc-verification.entity';
import {
  FIXED_NOW,
  FakeKycVerifier,
  InMemoryKycRepository,
  completedOutcome,
  fixedClock,
  pendingOutcome,
  sequentialIds,
} from '../../test-support/doubles';
import { SubmitKycUseCase } from './submit-kyc.use-case';

describe('SubmitKycUseCase', () => {
  let repo: InMemoryKycRepository;

  beforeEach(() => {
    repo = new InMemoryKycRepository();
  });

  function useCase(verifier: FakeKycVerifier): SubmitKycUseCase {
    return new SubmitKycUseCase(repo, verifier, fixedClock, sequentialIds());
  }

  const ngCommand = {
    ownerId: 'owner-ng',
    country: 'NG',
    firstName: 'Chidi',
    lastName: 'Eze',
    dateOfBirth: '1990-04-20',
    documentType: 'NIN',
    idNumber: '12345678901',
    faceImageBase64: 'selfie-base64',
  };

  it('verifies a Nigeria owner when the details and face match', async () => {
    const verifier = new FakeKycVerifier(
      completedOutcome(
        { firstName: 'Chidi', lastName: 'Eze', dateOfBirth: new Date('1990-04-20') },
        FaceMatchOutcome.Match,
      ),
    );

    const result = await useCase(verifier).execute(ngCommand);

    expect(result.status).toBe(KycStatus.Verified);
    expect(result.maskedReference).toBe('8901');
    expect(result.faceMatch).toBe(FaceMatchOutcome.Match);
    expect(result.mismatchedFields).toEqual([]);
    expect(verifier.lastRequest?.faceImageBase64).toBe('selfie-base64');
  });

  it('records the selfie is passed to the verifier only, never returned', async () => {
    const verifier = new FakeKycVerifier(
      completedOutcome(
        { firstName: 'Chidi', lastName: 'Eze', dateOfBirth: new Date('1990-04-20') },
        FaceMatchOutcome.Match,
      ),
    );

    const result = await useCase(verifier).execute(ngCommand);

    expect(result).not.toHaveProperty('faceImageBase64');
    expect(verifier.lastRequest?.faceImageBase64).toBe('selfie-base64');
  });

  it('rejects and records the difference when a detail does not match', async () => {
    const verifier = new FakeKycVerifier(
      completedOutcome(
        { firstName: 'Chidi', lastName: 'Ezeh', dateOfBirth: new Date('1990-04-20') },
        FaceMatchOutcome.Match,
      ),
    );

    const result = await useCase(verifier).execute(ngCommand);

    expect(result.status).toBe(KycStatus.Rejected);
    expect(result.mismatchedFields).toEqual(['lastName']);
    const stored = await repo.findByOwner('owner-ng');
    expect(stored?.mismatches).toEqual([{ field: 'lastName', provided: 'Eze', returned: 'Ezeh' }]);
  });

  it('rejects when the face does not match even if the details do', async () => {
    const verifier = new FakeKycVerifier(
      completedOutcome(
        { firstName: 'Chidi', lastName: 'Eze', dateOfBirth: new Date('1990-04-20') },
        FaceMatchOutcome.NoMatch,
      ),
    );

    const result = await useCase(verifier).execute(ngCommand);

    expect(result.status).toBe(KycStatus.Rejected);
    expect(result.faceMatch).toBe(FaceMatchOutcome.NoMatch);
    expect(result.mismatchedFields).toEqual([]);
  });

  it('fails when the provider cannot find the document', async () => {
    const verifier = new FakeKycVerifier({ state: 'not_found', providerReference: null });

    const result = await useCase(verifier).execute(ngCommand);

    expect(result.status).toBe(KycStatus.Failed);
  });

  it('requires a live photo for Nigeria', async () => {
    const verifier = new FakeKycVerifier(
      completedOutcome({ firstName: 'Chidi', lastName: 'Eze' }, FaceMatchOutcome.Match),
    );

    await expect(
      useCase(verifier).execute({ ...ngCommand, faceImageBase64: '' }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('rejects a malformed NIN', async () => {
    const verifier = new FakeKycVerifier(
      completedOutcome({ firstName: 'Chidi', lastName: 'Eze' }, FaceMatchOutcome.Match),
    );

    await expect(
      useCase(verifier).execute({ ...ngCommand, idNumber: '123' }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('opens a pending Stripe session for a US owner and returns the client secret', async () => {
    const verifier = new FakeKycVerifier(pendingOutcome());

    const result = await useCase(verifier).execute({
      ownerId: 'owner-us',
      country: 'US',
      firstName: 'Ada',
      lastName: 'Obi',
      dateOfBirth: '1988-01-02',
    });

    expect(result.status).toBe(KycStatus.Pending);
    expect(result.clientSecret).toBe('vs_123_secret');
    expect(verifier.lastRequest?.provider).toBe(KycProvider.Stripe);
    expect(verifier.lastRequest?.idNumber).toBeUndefined();
  });

  it('returns an already verified owner unchanged without re verifying', async () => {
    const verified = KycVerification.start({
      id: 'kyc-existing',
      ownerId: 'owner-ng',
      country: 'NG',
      provider: KycProvider.QoreId,
      documentType: null,
      claimed: { firstName: 'Chidi', lastName: 'Eze', dateOfBirth: new Date('1990-04-20') },
      now: FIXED_NOW,
    });
    verified.markVerified(FIXED_NOW, FaceMatchOutcome.Match);
    await repo.save(verified);

    const verifier = new FakeKycVerifier({ state: 'not_found', providerReference: null });
    const result = await useCase(verifier).execute(ngCommand);

    expect(result.status).toBe(KycStatus.Verified);
    expect(verifier.lastRequest).toBeNull();
  });
});
