import { FamilyMemberStatus } from '@prisma/client';
import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  FamilyDetailView,
  FamilyDirectoryReadModel,
  FamilyKpisView,
  FamilyPageView,
} from '../ports/family-directory-read.port';
import { GetFamiliesKpisUseCase } from './get-families-kpis.use-case';
import { GetFamilyDetailUseCase } from './get-family-detail.use-case';
import { ListFamiliesUseCase } from './list-families.use-case';

const NOW = new Date('2026-09-20T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function page(): FamilyPageView {
  return {
    total: 1,
    rows: [
      {
        id: 'fam-1',
        reference: 'FAM-1029',
        name: 'David Johnson',
        relationship: 'Son / Primary',
        hasAccount: true,
        phone: '(555) 123-4567',
        email: 'david.johnson@email.com',
        linkedRecipientNames: ['Margaret Johnson'],
        billingStatus: 'CURRENT',
        status: FamilyMemberStatus.ACTIVE,
        unreadMessages: null,
        lastActivity: new Date('2026-09-20T10:15:00.000Z'),
      },
    ],
  };
}

function kpis(): FamilyKpisView {
  return {
    totalFamilies: 187,
    newFamilies: 12,
    primaryContacts: 203,
    withActiveCare: 164,
    outstandingPayments: 8,
    pendingRequests: 5,
    unreadMessages: null,
  };
}

function detail(): FamilyDetailView {
  return {
    id: 'fam-1',
    reference: 'FAM-1029',
    name: 'David Johnson',
    relationship: 'Son / Primary',
    hasAccount: true,
    phone: '(555) 123-4567',
    email: 'david.johnson@email.com',
    primaryRecipientName: 'Margaret Johnson',
    linkedRecipientNames: ['Margaret Johnson'],
    emergencyContactVerified: true,
    outstandingBalanceMinor: 0,
    currency: 'NGN',
    billingStatus: 'CURRENT',
    status: FamilyMemberStatus.ACTIVE,
    quickNotes: 'Prefers phone calls over email.',
    lastActivity: new Date('2026-09-20T10:15:00.000Z'),
    unreadMessages: null,
  };
}

function reads(found: FamilyDetailView | null): FamilyDirectoryReadModel {
  return {
    list: () => Promise.resolve(page()),
    kpis: () => Promise.resolve(kpis()),
    detail: () => Promise.resolve(found),
  };
}

describe('ListFamiliesUseCase', () => {
  it('maps directory rows with reference, recipients and billing', async () => {
    const result = await new ListFamiliesUseCase(reads(detail())).execute({
      status: null,
      page: 1,
      pageSize: 20,
    });
    const row = result.rows[0];
    expect(row.reference).toBe('FAM-1029');
    expect(row.linkedRecipientNames).toEqual(['Margaret Johnson']);
    expect(row.billingStatus).toBe('CURRENT');
    expect(row.unreadMessages).toBeNull();
    expect(row.lastActivity).toBe('2026-09-20T10:15:00.000Z');
  });
});

describe('GetFamiliesKpisUseCase', () => {
  it('returns the KPI bar with unread messages deferred', async () => {
    const result = await new GetFamiliesKpisUseCase(reads(detail()), clock).execute();
    expect(result.totalFamilies).toBe(187);
    expect(result.newFamilies).toBe(12);
    expect(result.pendingRequests).toBe(5);
    expect(result.unreadMessages).toBeNull();
  });
});

describe('GetFamilyDetailUseCase', () => {
  it('maps the preview drawer detail', async () => {
    const result = await new GetFamilyDetailUseCase(reads(detail())).execute('fam-1');
    expect(result.primaryRecipientName).toBe('Margaret Johnson');
    expect(result.emergencyContactVerified).toBe(true);
    expect(result.quickNotes).toBe('Prefers phone calls over email.');
  });

  it('rejects an unknown family member', async () => {
    await expect(new GetFamilyDetailUseCase(reads(null)).execute('nope')).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });
});
