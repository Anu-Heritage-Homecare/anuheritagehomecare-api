import { Currency } from '@shared/domain/currency.enum';
import { BranchStatus } from '../../domain/branch-status.enum';
import { Organization } from '../../domain/organization.entity';
import { OrganizationBranch } from '../../domain/organization-branch.entity';
import { OrganizationEmergencyContact } from '../../domain/organization-emergency-contact.entity';
import {
  ORGANIZATION_SINGLETON_ID,
  OrganizationRepository,
} from '../../domain/organization.repository';

export interface DayHoursResult {
  dayOfWeek: number;
  isOpen: boolean;
  openMinute: number;
  closeMinute: number;
}

export interface BranchResult {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  phone: string | null;
  managerId: string | null;
  managerName: string | null;
  status: BranchStatus;
  businessHours: DayHoursResult[];
}

export interface EmergencyContactResult {
  id: string;
  name: string;
  role: string | null;
  phone: string;
}

/** The whole Organization Profile settings screen in one shape. */
export interface OrganizationResult {
  legalName: string | null;
  businessRegNumber: string | null;
  registeredAddress: string | null;
  timezone: string | null;
  systemLanguage: string | null;
  currency: Currency;
  dateFormat: string | null;
  businessHours: DayHoursResult[];
  branches: BranchResult[];
  emergencyContacts: EmergencyContactResult[];
}

function toBranchResult(branch: OrganizationBranch): BranchResult {
  return {
    id: branch.id,
    name: branch.name,
    addressLine1: branch.addressLine1,
    addressLine2: branch.addressLine2,
    city: branch.city,
    state: branch.state,
    phone: branch.phone,
    managerId: branch.managerId,
    managerName: branch.managerName,
    status: branch.status,
    businessHours: branch.businessHours.map((day) => ({ ...day })),
  };
}

function toContactResult(contact: OrganizationEmergencyContact): EmergencyContactResult {
  return {
    id: contact.id,
    name: contact.name,
    role: contact.role,
    phone: contact.phone,
  };
}

function toOrganizationResult(
  organization: Organization,
  branches: OrganizationBranch[],
  contacts: OrganizationEmergencyContact[],
): OrganizationResult {
  return {
    legalName: organization.legalName,
    businessRegNumber: organization.businessRegNumber,
    registeredAddress: organization.registeredAddress,
    timezone: organization.timezone,
    systemLanguage: organization.systemLanguage,
    currency: organization.currency,
    dateFormat: organization.dateFormat,
    businessHours: organization.businessHours.map((day) => ({ ...day })),
    branches: branches.map(toBranchResult),
    emergencyContacts: contacts.map(toContactResult),
  };
}

/**
 * Assemble the whole screen from the repository. Every read and every mutation
 * returns this so the client always receives the up to date settings in one call.
 */
export async function loadOrganizationResult(
  repository: OrganizationRepository,
  now: Date,
): Promise<OrganizationResult> {
  const [organization, branches, contacts] = await Promise.all([
    repository.getProfile(),
    repository.listBranches(),
    repository.listContacts(),
  ]);
  return toOrganizationResult(
    organization ?? Organization.empty(ORGANIZATION_SINGLETON_ID, now),
    branches,
    contacts,
  );
}
