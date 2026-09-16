import { ClientApplication } from '@modules/client-onboarding/domain/client-application.entity';
import { ClientApplicationRepository } from '@modules/client-onboarding/domain/client-application.repository';
import { OnboardingStatus } from '@modules/client-onboarding/domain/onboarding-status.enum';
import { Currency } from '@shared/domain/currency.enum';
import { BulkUpdateApplicationsUseCase } from './bulk-update-applications.use-case';

const NOW = new Date('2026-09-16T12:00:00.000Z');
const clock = { now: () => NOW };

function application(id: string): ClientApplication {
  return ClientApplication.open({
    id,
    familyName: 'Family',
    patientName: 'Patient',
    currency: Currency.UnitedStatesDollar,
    now: new Date('2026-09-10T09:00:00.000Z'),
  });
}

function repo(
  store: Map<string, ClientApplication>,
): ClientApplicationRepository & { saved: ClientApplication[] } {
  const saved: ClientApplication[] = [];
  return {
    saved,
    findById: (id) => Promise.resolve(store.get(id) ?? null),
    save: (a) => {
      saved.push(a);
      return Promise.resolve();
    },
  };
}

describe('BulkUpdateApplicationsUseCase', () => {
  it('approves the found applications and reports missing ids', async () => {
    const a1 = application('a1');
    const a2 = application('a2');
    const store = new Map([
      ['a1', a1],
      ['a2', a2],
    ]);
    const repository = repo(store);
    const result = await new BulkUpdateApplicationsUseCase(repository, clock).execute({
      ids: ['a1', 'a2', 'missing', 'a1'],
      action: 'APPROVE',
    });
    expect(result.updated).toBe(2);
    expect(result.notFound).toEqual(['missing']);
    expect(a1.status).toBe(OnboardingStatus.Approved);
    expect(a2.status).toBe(OnboardingStatus.Approved);
    expect(repository.saved).toHaveLength(2);
  });

  it('rejects the selection when the action is reject', async () => {
    const a1 = application('a1');
    const result = await new BulkUpdateApplicationsUseCase(
      repo(new Map([['a1', a1]])),
      clock,
    ).execute({ ids: ['a1'], action: 'REJECT' });
    expect(result.updated).toBe(1);
    expect(a1.status).toBe(OnboardingStatus.Rejected);
  });
});
