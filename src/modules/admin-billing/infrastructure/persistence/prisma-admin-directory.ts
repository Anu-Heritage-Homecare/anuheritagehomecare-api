import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { AdminDirectory } from '../../application/ports/admin-directory.port';

/** Resolves admin ids to "First Last" names in one query. */
@Injectable()
export class PrismaAdminDirectory implements AdminDirectory {
  constructor(private readonly prisma: PrismaService) {}

  async names(adminIds: (string | null)[]): Promise<Map<string, string>> {
    const unique = [...new Set(adminIds.filter((id): id is string => id !== null))];
    if (unique.length === 0) {
      return new Map();
    }
    const admins = await this.prisma.adminUser.findMany({
      where: { id: { in: unique } },
      select: { id: true, firstName: true, lastName: true },
    });
    return new Map(admins.map((a) => [a.id, `${a.firstName} ${a.lastName}`.trim()]));
  }
}
