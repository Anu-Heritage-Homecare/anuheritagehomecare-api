import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  InvoiceAccountPreviewView,
  InvoiceWizardReadModel,
  RecipientServicePreviewView,
} from '../ports/invoice-wizard-read.port';
import { GetInvoiceAccountPreviewUseCase } from './get-invoice-account-preview.use-case';
import { GetRecipientServicePreviewUseCase } from './get-recipient-service-preview.use-case';

function view(overrides: Partial<InvoiceAccountPreviewView> = {}): InvoiceAccountPreviewView {
  return {
    id: 'a1',
    sequence: 81,
    createdAt: new Date('2026-03-04T00:00:00.000Z'),
    name: 'Adeyemi Family Account',
    status: 'ACTIVE',
    primaryContactName: 'Tunde Adeyemi',
    primaryContactRelationship: 'Son',
    contactEmail: 'tunde@adeyemifamily.com',
    contactPhone: '+234 803 123 4567',
    billingAddress: 'Victoria Island, Lagos',
    outstandingBalanceMinor: 28_000_000,
    currency: 'NGN',
    lastInvoiceSequence: 412,
    lastInvoiceIssuedAt: new Date('2026-05-10T09:00:00.000Z'),
    lastInvoiceStatus: 'PAID',
    ...overrides,
  };
}

function recipientView(
  overrides: Partial<RecipientServicePreviewView> = {},
): RecipientServicePreviewView {
  return {
    id: 'r1',
    name: 'Mrs. Funmilayo Adeyemi',
    carePlanModel: 'Full-Time Dementia Care Support',
    assignedCaregiverName: 'Chioma Nnaji',
    assignedCaregiverTitle: 'Registered Nurse',
    careNeeds: ['MEAL_PREPARATION', 'BATHING'],
    ...overrides,
  };
}

/** A read model stubbing both previews; override either to return a specific view or null. */
function reads(over: Partial<InvoiceWizardReadModel> = {}): InvoiceWizardReadModel {
  return {
    accountPreview: () => Promise.resolve(view()),
    recipientServicePreview: () => Promise.resolve(recipientView()),
    ...over,
  };
}

describe('GetInvoiceAccountPreviewUseCase', () => {
  it('formats the account and last invoice references and passes the card through', async () => {
    const result = await new GetInvoiceAccountPreviewUseCase(reads()).execute('a1');

    expect(result.accountNumber).toBe('ACC-2026-081');
    expect(result.lastInvoiceNumber).toBe('INV-2026-412');
    expect(result.lastInvoiceStatus).toBe('PAID');
    expect(result.primaryContactRelationship).toBe('Son');
    expect(result.billingAddress).toBe('Victoria Island, Lagos');
    expect(result.outstandingBalanceMinor).toBe(28_000_000);
  });

  it('returns a null last invoice when the account has never been invoiced', async () => {
    const result = await new GetInvoiceAccountPreviewUseCase(
      reads({
        accountPreview: () =>
          Promise.resolve(
            view({ lastInvoiceSequence: null, lastInvoiceIssuedAt: null, lastInvoiceStatus: null }),
          ),
      }),
    ).execute('a1');
    expect(result.lastInvoiceNumber).toBeNull();
    expect(result.lastInvoiceStatus).toBeNull();
  });

  it('throws when the account is unknown', async () => {
    await expect(
      new GetInvoiceAccountPreviewUseCase(
        reads({ accountPreview: () => Promise.resolve(null) }),
      ).execute('missing'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});

describe('GetRecipientServicePreviewUseCase', () => {
  it('maps care needs to display labels and passes the plan and caregiver through', async () => {
    const result = await new GetRecipientServicePreviewUseCase(reads()).execute('r1');

    expect(result.carePlanModel).toBe('Full-Time Dementia Care Support');
    expect(result.assignedCaregiverName).toBe('Chioma Nnaji');
    expect(result.assignedCaregiverTitle).toBe('Registered Nurse');
    expect(result.keyBillableTargets).toEqual(['Meal Preparation', 'Bathing']);
  });

  it('throws when the recipient is unknown', async () => {
    await expect(
      new GetRecipientServicePreviewUseCase(
        reads({ recipientServicePreview: () => Promise.resolve(null) }),
      ).execute('missing'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
