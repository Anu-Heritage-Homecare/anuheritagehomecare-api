import { Injectable } from '@nestjs/common';
import {
  Prisma,
  BranchStatus as PrismaBranchStatus,
  Currency as PrismaCurrency,
  Organization as PrismaOrganization,
  OrganizationBusinessHour as PrismaBusinessHour,
  OrganizationEmergencyContact as PrismaContact,
} from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { BranchStatus } from '../../domain/branch-status.enum';
import { BRANCH_DEFAULT_BUSINESS_HOURS } from '../../domain/organization-branch.entity';
import { DEFAULT_BUSINESS_HOURS, Organization } from '../../domain/organization.entity';
import { OrganizationBranch } from '../../domain/organization-branch.entity';
import { OrganizationEmergencyContact } from '../../domain/organization-emergency-contact.entity';
import {
  ORGANIZATION_SINGLETON_ID,
  OrganizationRepository,
} from '../../domain/organization.repository';

const TO_DOMAIN_CURRENCY: Record<PrismaCurrency, Currency> = {
  USD: Currency.UnitedStatesDollar,
  NGN: Currency.NigerianNaira,
};
const TO_PRISMA_CURRENCY: Record<Currency, PrismaCurrency> = {
  [Currency.UnitedStatesDollar]: 'USD',
  [Currency.NigerianNaira]: 'NGN',
};
const BRANCH_INCLUDE = {
  manager: { select: { firstName: true, lastName: true } },
  businessHours: { orderBy: { dayOfWeek: 'asc' } },
} satisfies Prisma.OrganizationBranchInclude;

type BranchRow = Prisma.OrganizationBranchGetPayload<{ include: typeof BRANCH_INCLUDE }>;

const TO_DOMAIN_BRANCH_STATUS: Record<PrismaBranchStatus, BranchStatus> = {
  ACTIVE: BranchStatus.Active,
  INACTIVE: BranchStatus.Inactive,
};
const TO_PRISMA_BRANCH_STATUS: Record<BranchStatus, PrismaBranchStatus> = {
  [BranchStatus.Active]: 'ACTIVE',
  [BranchStatus.Inactive]: 'INACTIVE',
};

/** Prisma backed adapter for the OrganizationRepository port. */
@Injectable()
export class OrganizationPrismaRepository implements OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(): Promise<Organization | null> {
    const row = await this.prisma.organization.findUnique({
      where: { id: ORGANIZATION_SINGLETON_ID },
      include: { businessHours: { orderBy: { dayOfWeek: 'asc' } } },
    });
    return row ? OrganizationPrismaRepository.toDomain(row) : null;
  }

  async saveProfile(organization: Organization): Promise<void> {
    const profile = {
      legalName: organization.legalName,
      businessRegNumber: organization.businessRegNumber,
      registeredAddress: organization.registeredAddress,
      timezone: organization.timezone,
      systemLanguage: organization.systemLanguage,
      currency: TO_PRISMA_CURRENCY[organization.currency],
      dateFormat: organization.dateFormat,
      updatedAt: organization.updatedAt,
    };
    const hours = organization.businessHours.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      isOpen: day.isOpen,
      openMinute: day.openMinute,
      closeMinute: day.closeMinute,
    }));
    await this.prisma.$transaction([
      this.prisma.organization.upsert({
        where: { id: ORGANIZATION_SINGLETON_ID },
        create: { id: ORGANIZATION_SINGLETON_ID, ...profile, createdAt: organization.createdAt },
        update: profile,
      }),
      this.prisma.organizationBusinessHour.deleteMany({
        where: { organizationId: ORGANIZATION_SINGLETON_ID },
      }),
      this.prisma.organizationBusinessHour.createMany({
        data: hours.map((day) => ({ organizationId: ORGANIZATION_SINGLETON_ID, ...day })),
      }),
    ]);
  }

  async listBranches(): Promise<OrganizationBranch[]> {
    const rows = await this.prisma.organizationBranch.findMany({
      where: { organizationId: ORGANIZATION_SINGLETON_ID },
      orderBy: { createdAt: 'asc' },
      include: BRANCH_INCLUDE,
    });
    return rows.map((row) => OrganizationPrismaRepository.toBranchDomain(row));
  }

  async findBranch(id: string): Promise<OrganizationBranch | null> {
    const row = await this.prisma.organizationBranch.findUnique({
      where: { id },
      include: BRANCH_INCLUDE,
    });
    return row ? OrganizationPrismaRepository.toBranchDomain(row) : null;
  }

  async saveBranch(branch: OrganizationBranch): Promise<void> {
    const data = {
      name: branch.name,
      addressLine1: branch.addressLine1,
      addressLine2: branch.addressLine2,
      city: branch.city,
      state: branch.state,
      phone: branch.phone,
      managerId: branch.managerId,
      status: TO_PRISMA_BRANCH_STATUS[branch.status],
      updatedAt: branch.updatedAt,
    };
    const hours = branch.businessHours.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      isOpen: day.isOpen,
      openMinute: day.openMinute,
      closeMinute: day.closeMinute,
    }));
    await this.prisma.$transaction([
      this.ensureOrganization(),
      this.prisma.organizationBranch.upsert({
        where: { id: branch.id },
        create: {
          id: branch.id,
          organizationId: ORGANIZATION_SINGLETON_ID,
          createdAt: branch.createdAt,
          ...data,
        },
        update: data,
      }),
      this.prisma.branchBusinessHour.deleteMany({ where: { branchId: branch.id } }),
      this.prisma.branchBusinessHour.createMany({
        data: hours.map((day) => ({ branchId: branch.id, ...day })),
      }),
    ]);
  }

  async deleteBranch(id: string): Promise<void> {
    await this.prisma.organizationBranch.delete({ where: { id } });
  }

  async managerExists(adminUserId: string): Promise<boolean> {
    const count = await this.prisma.adminUser.count({ where: { id: adminUserId } });
    return count > 0;
  }

  async listContacts(): Promise<OrganizationEmergencyContact[]> {
    const rows = await this.prisma.organizationEmergencyContact.findMany({
      where: { organizationId: ORGANIZATION_SINGLETON_ID },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => OrganizationPrismaRepository.toContactDomain(row));
  }

  async findContact(id: string): Promise<OrganizationEmergencyContact | null> {
    const row = await this.prisma.organizationEmergencyContact.findUnique({ where: { id } });
    return row ? OrganizationPrismaRepository.toContactDomain(row) : null;
  }

  async saveContact(contact: OrganizationEmergencyContact): Promise<void> {
    const data = {
      name: contact.name,
      role: contact.role,
      phone: contact.phone,
      updatedAt: contact.updatedAt,
    };
    await this.prisma.$transaction([
      this.ensureOrganization(),
      this.prisma.organizationEmergencyContact.upsert({
        where: { id: contact.id },
        create: {
          id: contact.id,
          organizationId: ORGANIZATION_SINGLETON_ID,
          createdAt: contact.createdAt,
          ...data,
        },
        update: data,
      }),
    ]);
  }

  async deleteContact(id: string): Promise<void> {
    await this.prisma.organizationEmergencyContact.delete({ where: { id } });
  }

  /** Create the singleton organization row if it does not exist, so child FKs hold. */
  private ensureOrganization(): Prisma.PrismaPromise<PrismaOrganization> {
    return this.prisma.organization.upsert({
      where: { id: ORGANIZATION_SINGLETON_ID },
      create: { id: ORGANIZATION_SINGLETON_ID },
      update: {},
    });
  }

  private static toDomain(
    row: PrismaOrganization & { businessHours: PrismaBusinessHour[] },
  ): Organization {
    return Organization.rehydrate(row.id, {
      legalName: row.legalName,
      businessRegNumber: row.businessRegNumber,
      registeredAddress: row.registeredAddress,
      timezone: row.timezone,
      systemLanguage: row.systemLanguage,
      currency: TO_DOMAIN_CURRENCY[row.currency],
      dateFormat: row.dateFormat,
      businessHours:
        row.businessHours.length > 0
          ? row.businessHours.map((day) => ({
              dayOfWeek: day.dayOfWeek,
              isOpen: day.isOpen,
              openMinute: day.openMinute,
              closeMinute: day.closeMinute,
            }))
          : DEFAULT_BUSINESS_HOURS.map((day) => ({ ...day })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private static toBranchDomain(row: BranchRow): OrganizationBranch {
    const managerName = row.manager
      ? `${row.manager.firstName} ${row.manager.lastName}`.trim()
      : null;
    return OrganizationBranch.rehydrate(row.id, {
      name: row.name,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      city: row.city,
      state: row.state,
      phone: row.phone,
      managerId: row.managerId,
      managerName,
      status: TO_DOMAIN_BRANCH_STATUS[row.status],
      businessHours:
        row.businessHours.length > 0
          ? row.businessHours.map((day) => ({
              dayOfWeek: day.dayOfWeek,
              isOpen: day.isOpen,
              openMinute: day.openMinute,
              closeMinute: day.closeMinute,
            }))
          : BRANCH_DEFAULT_BUSINESS_HOURS.map((day) => ({ ...day })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private static toContactDomain(row: PrismaContact): OrganizationEmergencyContact {
    return OrganizationEmergencyContact.rehydrate(row.id, {
      name: row.name,
      role: row.role,
      phone: row.phone,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
