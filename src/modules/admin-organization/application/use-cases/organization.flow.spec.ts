import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { BranchStatus } from '../../domain/branch-status.enum';
import { DayHours, DEFAULT_BUSINESS_HOURS, Organization } from '../../domain/organization.entity';
import { OrganizationBranch } from '../../domain/organization-branch.entity';
import { OrganizationEmergencyContact } from '../../domain/organization-emergency-contact.entity';
import { OrganizationRepository } from '../../domain/organization.repository';
import { AddBranchUseCase, DeleteBranchUseCase, UpdateBranchUseCase } from './branch.use-cases';
import {
  AddEmergencyContactUseCase,
  DeleteEmergencyContactUseCase,
  UpdateEmergencyContactUseCase,
} from './emergency-contact.use-cases';
import { GetOrganizationUseCase } from './get-organization.use-case';
import { SetBusinessHoursUseCase } from './set-business-hours.use-case';
import { UpdateOrganizationProfileUseCase } from './update-organization-profile.use-case';

const NOW = new Date('2026-11-09T09:00:00.000Z');
const clock: Clock = { now: () => NOW };

function sequentialIds(): IdGenerator {
  let n = 0;
  return {
    generate: () => {
      n += 1;
      return `id-${n}`;
    },
  };
}

class InMemoryOrganizationRepository implements OrganizationRepository {
  public organization: Organization | null = null;
  public branches = new Map<string, OrganizationBranch>();
  public contacts = new Map<string, OrganizationEmergencyContact>();
  public managers = new Set<string>();

  getProfile(): Promise<Organization | null> {
    return Promise.resolve(this.organization);
  }
  saveProfile(organization: Organization): Promise<void> {
    this.organization = organization;
    return Promise.resolve();
  }
  listBranches(): Promise<OrganizationBranch[]> {
    return Promise.resolve([...this.branches.values()]);
  }
  findBranch(id: string): Promise<OrganizationBranch | null> {
    return Promise.resolve(this.branches.get(id) ?? null);
  }
  saveBranch(branch: OrganizationBranch): Promise<void> {
    this.branches.set(branch.id, branch);
    return Promise.resolve();
  }
  deleteBranch(id: string): Promise<void> {
    this.branches.delete(id);
    return Promise.resolve();
  }
  managerExists(adminUserId: string): Promise<boolean> {
    return Promise.resolve(this.managers.has(adminUserId));
  }
  listContacts(): Promise<OrganizationEmergencyContact[]> {
    return Promise.resolve([...this.contacts.values()]);
  }
  findContact(id: string): Promise<OrganizationEmergencyContact | null> {
    return Promise.resolve(this.contacts.get(id) ?? null);
  }
  saveContact(contact: OrganizationEmergencyContact): Promise<void> {
    this.contacts.set(contact.id, contact);
    return Promise.resolve();
  }
  deleteContact(id: string): Promise<void> {
    this.contacts.delete(id);
    return Promise.resolve();
  }
}

function fullWeek(): DayHours[] {
  return DEFAULT_BUSINESS_HOURS.map((day) => ({ ...day, isOpen: true }));
}

describe('Admin organization flows', () => {
  let repo: InMemoryOrganizationRepository;

  beforeEach(() => {
    repo = new InMemoryOrganizationRepository();
  });

  it('returns a default empty profile with seven days when nothing is configured', async () => {
    const result = await new GetOrganizationUseCase(repo, clock).execute();
    expect(result.legalName).toBeNull();
    expect(result.currency).toBe(Currency.NigerianNaira);
    expect(result.businessHours).toHaveLength(7);
    expect(result.branches).toEqual([]);
    expect(result.emergencyContacts).toEqual([]);
  });

  it('saves the profile, trimming text and clearing blanks', async () => {
    const result = await new UpdateOrganizationProfileUseCase(repo, clock).execute({
      legalName: '  CareProfs Health Services Ltd  ',
      businessRegNumber: '',
      currency: Currency.UnitedStatesDollar,
    });
    expect(result.legalName).toBe('CareProfs Health Services Ltd');
    expect(result.businessRegNumber).toBeNull();
    expect(result.currency).toBe(Currency.UnitedStatesDollar);
    expect(repo.organization).not.toBeNull();
  });

  it('replaces the weekly schedule', async () => {
    const days = fullWeek();
    days[0] = { dayOfWeek: 0, isOpen: false, openMinute: 0, closeMinute: 0 };
    const result = await new SetBusinessHoursUseCase(repo, clock).execute({ days });
    expect(result.businessHours[0]).toEqual({
      dayOfWeek: 0,
      isOpen: false,
      openMinute: 0,
      closeMinute: 0,
    });
    expect(result.businessHours[1].isOpen).toBe(true);
  });

  it('rejects a schedule that does not cover all seven days', async () => {
    const days = fullWeek().slice(0, 6);
    await expect(new SetBusinessHoursUseCase(repo, clock).execute({ days })).rejects.toBeInstanceOf(
      ValidationException,
    );
  });

  it('rejects an open day that closes before it opens', async () => {
    const days = fullWeek();
    days[1] = { dayOfWeek: 1, isOpen: true, openMinute: 1000, closeMinute: 500 };
    await expect(new SetBusinessHoursUseCase(repo, clock).execute({ days })).rejects.toBeInstanceOf(
      ValidationException,
    );
  });

  it('adds, updates and deletes a branch', async () => {
    repo.managers.add('mgr-1');
    const add = new AddBranchUseCase(repo, clock, sequentialIds());
    const added = await add.execute({
      name: 'Ikeja Mainland',
      addressLine1: '24 Allen Avenue',
      city: 'Ikeja',
      state: 'Lagos',
      phone: '08012345678',
      managerId: 'mgr-1',
    });
    expect(added.branches).toHaveLength(1);
    expect(added.branches[0].city).toBe('Ikeja');
    expect(added.branches[0].businessHours).toHaveLength(7);
    expect(added.branches[0].businessHours[0].isOpen).toBe(false);
    expect(added.branches[0].businessHours[1].isOpen).toBe(true);
    const branchId = [...repo.branches.keys()][0];

    const updated = await new UpdateBranchUseCase(repo, clock).execute({
      branchId,
      status: BranchStatus.Inactive,
    });
    expect(updated.branches[0].status).toBe(BranchStatus.Inactive);

    const deleted = await new DeleteBranchUseCase(repo, clock).execute(branchId);
    expect(deleted.branches).toEqual([]);
  });

  it('rejects a branch whose manager does not exist', async () => {
    const add = new AddBranchUseCase(repo, clock, sequentialIds());
    await expect(
      add.execute({
        name: 'Ikeja Mainland',
        addressLine1: '24 Allen Avenue',
        city: 'Ikeja',
        state: 'Lagos',
        managerId: 'ghost',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('raises when updating a missing branch', async () => {
    await expect(
      new UpdateBranchUseCase(repo, clock).execute({ branchId: 'nope', name: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('adds, updates and deletes an emergency contact', async () => {
    const add = new AddEmergencyContactUseCase(repo, clock, sequentialIds());
    await add.execute({
      name: 'Dr. Folake Adeyemi',
      role: 'Medical Director',
      phone: '08012345678',
    });
    const contactId = [...repo.contacts.keys()][0];

    const updated = await new UpdateEmergencyContactUseCase(repo, clock).execute({
      contactId,
      phone: '08011112222',
    });
    expect(updated.emergencyContacts[0].phone).toBe('08011112222');

    const deleted = await new DeleteEmergencyContactUseCase(repo, clock).execute(contactId);
    expect(deleted.emergencyContacts).toEqual([]);
  });

  it('raises when deleting a missing contact', async () => {
    await expect(
      new DeleteEmergencyContactUseCase(repo, clock).execute('nope'),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
