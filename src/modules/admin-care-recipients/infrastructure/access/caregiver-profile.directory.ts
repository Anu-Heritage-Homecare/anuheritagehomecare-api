import { Injectable } from '@nestjs/common';
import { UserType } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CaregiverDirectory } from '../../application/ports/caregiver-directory.port';

/**
 * Resolves an incoming caregiver reference to the identity user id. A caregiver
 * user id is returned as is; a CaregiverProfile id is translated to its user id;
 * anything else is unknown. The user lookup runs first because the correct path
 * (a user id) is the common case and resolves in one round trip.
 */
@Injectable()
export class CaregiverProfileDirectory implements CaregiverDirectory {
  constructor(private readonly prisma: PrismaService) {}

  async resolveToUserId(id: string): Promise<string | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, userType: UserType.CAREGIVER },
      select: { id: true },
    });
    if (user !== null) {
      return user.id;
    }
    const profile = await this.prisma.caregiverProfile.findUnique({
      where: { id },
      select: { userId: true },
    });
    return profile?.userId ?? null;
  }
}
