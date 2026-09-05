import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { ProfilePreferences } from '../../domain/profile-preferences.entity';
import { ProfilePreferencesRepository } from '../../domain/profile-preferences.repository';
import { ProfilePreferencesMapper } from './profile-preferences.mapper';

/** Prisma backed adapter for the ProfilePreferencesRepository port. */
@Injectable()
export class ProfilePreferencesPrismaRepository implements ProfilePreferencesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(userId: string): Promise<ProfilePreferences | null> {
    const row = await this.prisma.profilePreferences.findUnique({ where: { userId } });
    return row === null ? null : ProfilePreferencesMapper.toDomain(row);
  }

  async save(preferences: ProfilePreferences): Promise<void> {
    const row = ProfilePreferencesMapper.toPersistence(preferences);
    const { userId, ...mutable } = row;
    await this.prisma.profilePreferences.upsert({
      where: { userId },
      create: row,
      update: mutable,
    });
  }
}
