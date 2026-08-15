import { ValidationException } from '@shared/domain/domain-exception';
import { KycStatus } from '../../domain/kyc-status.enum';
import {
  FakeKycVerifier,
  InMemoryKycRepository,
  fixedClock,
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

  it('verifies a US owner by the SSN last four and stores only the masked value', async () => {
    const verifier = new FakeKycVerifier('verified');
    const result = await useCase(verifier).execute({
      ownerId: 'owner-1',
      country: 'US',
      fullName: 'Ada Obi',
      documentType: 'SSN_LAST4',
      ssnLast4: '6789',
    });

    expect(result.status).toBe(KycStatus.Verified);
    expect(result.maskedReference).toBe('6789');
    expect(verifier.lastDocumentValue).toBe('6789');
  });

  it('verifies a Nigeria owner by NIN', async () => {
    const result = await useCase(new FakeKycVerifier('verified')).execute({
      ownerId: 'owner-2',
      country: 'NG',
      fullName: 'Chidi Eze',
      documentType: 'NIN',
      idNumber: '12345678901',
    });

    expect(result.status).toBe(KycStatus.Verified);
    expect(result.maskedReference).toBe('8901');
  });

  it('rejects a document type that does not match the market', async () => {
    await expect(
      useCase(new FakeKycVerifier()).execute({
        ownerId: 'owner-1',
        country: 'US',
        fullName: 'Ada Obi',
        documentType: 'NIN',
        idNumber: '12345678901',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('rejects an SSN last four that is not four digits', async () => {
    await expect(
      useCase(new FakeKycVerifier()).execute({
        ownerId: 'owner-1',
        country: 'US',
        fullName: 'Ada Obi',
        documentType: 'SSN_LAST4',
        ssnLast4: '12',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('does not re verify an already verified owner', async () => {
    const first = new FakeKycVerifier('verified');
    await useCase(first).execute({
      ownerId: 'owner-1',
      country: 'US',
      fullName: 'Ada Obi',
      documentType: 'SSN_LAST4',
      ssnLast4: '6789',
    });

    const second = new FakeKycVerifier('failed');
    const result = await useCase(second).execute({
      ownerId: 'owner-1',
      country: 'US',
      fullName: 'Ada Obi',
      documentType: 'SSN_LAST4',
      ssnLast4: '0000',
    });

    expect(result.status).toBe(KycStatus.Verified);
    expect(second.lastDocumentValue).toBeNull();
  });
});
