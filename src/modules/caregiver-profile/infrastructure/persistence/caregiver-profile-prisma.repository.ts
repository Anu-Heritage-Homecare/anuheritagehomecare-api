import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CaregiverProfile } from '../../domain/caregiver-profile.entity';
import { CaregiverProfileRepository } from '../../domain/caregiver-profile.repository';
import {
  TO_DOMAIN_EMPLOYMENT,
  TO_DOMAIN_GENDER,
  TO_DOMAIN_STATUS,
  TO_PERSISTENCE_EMPLOYMENT,
  TO_PERSISTENCE_GENDER,
  TO_PERSISTENCE_STATUS,
} from './caregiver-profile-enum.maps';

type ProfileRow = Prisma.CaregiverProfileGetPayload<{ include: { notes: true } }>;

/** Prisma backed adapter for the CaregiverProfileRepository port. */
@Injectable()
export class CaregiverProfilePrismaRepository implements CaregiverProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(profile: CaregiverProfile): Promise<void> {
    const data = this.toData(profile);
    const notes = profile.pullPendingNotes();
    await this.prisma.$transaction(async (tx) => {
      await tx.caregiverProfile.upsert({
        where: { id: profile.id },
        create: data,
        update: {
          title: data.title,
          gender: data.gender,
          branch: data.branch,
          supervisorName: data.supervisorName,
          employmentType: data.employmentType,
          experienceYears: data.experienceYears,
          joinedAt: data.joinedAt,
          status: data.status,
          skills: data.skills,
          languages: data.languages,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          emergencyContactRelationship: data.emergencyContactRelationship,
          emergencyContactEmail: data.emergencyContactEmail,
          maxHoursPerWeek: data.maxHoursPerWeek,
          preferredShift: data.preferredShift,
          preferencesNote: data.preferencesNote,
          areasForGrowth: data.areasForGrowth,
          archivedAt: data.archivedAt,
          updatedAt: data.updatedAt,
        },
      });
      if (notes.length > 0) {
        await tx.caregiverProfileNote.createMany({
          data: notes.map((note) => ({
            profileId: profile.id,
            body: note.body,
            authorAdminId: note.authorAdminId,
            authorName: note.authorName,
            createdAt: note.createdAt,
          })),
        });
      }
    });
  }

  async findById(id: string): Promise<CaregiverProfile | null> {
    const row = await this.prisma.caregiverProfile.findUnique({
      where: { id },
      include: { notes: { orderBy: { createdAt: 'desc' } } },
    });
    return row === null ? null : this.toDomain(row);
  }

  async findByUserId(userId: string): Promise<CaregiverProfile | null> {
    const row = await this.prisma.caregiverProfile.findUnique({
      where: { userId },
      include: { notes: { orderBy: { createdAt: 'desc' } } },
    });
    return row === null ? null : this.toDomain(row);
  }

  private toData(profile: CaregiverProfile): Prisma.CaregiverProfileUncheckedCreateInput {
    const contact = profile.emergencyContact;
    return {
      id: profile.id,
      userId: profile.userId,
      title: profile.title,
      gender: profile.gender === null ? null : TO_PERSISTENCE_GENDER[profile.gender],
      branch: profile.branch,
      supervisorName: profile.supervisorName,
      employmentType:
        profile.employmentType === null ? null : TO_PERSISTENCE_EMPLOYMENT[profile.employmentType],
      experienceYears: profile.experienceYears,
      joinedAt: profile.joinedAt,
      status: TO_PERSISTENCE_STATUS[profile.status],
      skills: profile.skills,
      languages: profile.languages,
      emergencyContactName: contact.name,
      emergencyContactPhone: contact.phone,
      emergencyContactRelationship: contact.relationship,
      emergencyContactEmail: contact.email,
      maxHoursPerWeek: profile.maxHoursPerWeek,
      preferredShift: profile.preferredShift,
      preferencesNote: profile.preferencesNote,
      areasForGrowth: profile.areasForGrowth,
      archivedAt: profile.archivedAt,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private toDomain(row: ProfileRow): CaregiverProfile {
    return CaregiverProfile.rehydrate(
      row.id,
      {
        userId: row.userId,
        title: row.title,
        gender: row.gender === null ? null : TO_DOMAIN_GENDER[row.gender],
        branch: row.branch,
        supervisorName: row.supervisorName,
        employmentType:
          row.employmentType === null ? null : TO_DOMAIN_EMPLOYMENT[row.employmentType],
        experienceYears: row.experienceYears,
        joinedAt: row.joinedAt,
        status: TO_DOMAIN_STATUS[row.status],
        skills: row.skills,
        languages: row.languages,
        emergencyContactName: row.emergencyContactName,
        emergencyContactPhone: row.emergencyContactPhone,
        emergencyContactRelationship: row.emergencyContactRelationship,
        emergencyContactEmail: row.emergencyContactEmail,
        maxHoursPerWeek: row.maxHoursPerWeek,
        preferredShift: row.preferredShift,
        preferencesNote: row.preferencesNote,
        areasForGrowth: row.areasForGrowth,
        archivedAt: row.archivedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.notes.map((note) => ({
        body: note.body,
        authorAdminId: note.authorAdminId,
        authorName: note.authorName,
        createdAt: note.createdAt,
      })),
    );
  }
}
