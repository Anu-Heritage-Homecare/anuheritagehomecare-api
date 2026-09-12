import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CarePlanRevision } from '../../domain/care-plan-revision.entity';
import { CarePlanRevisionRepository } from '../../domain/care-plan-revision.repository';

/** Prisma backed adapter for the CarePlanRevisionRepository port (append only). */
@Injectable()
export class CarePlanRevisionPrismaRepository implements CarePlanRevisionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(revision: CarePlanRevision): Promise<void> {
    await this.prisma.carePlanRevision.create({
      data: {
        id: revision.id,
        careRecipientId: revision.careRecipientId,
        description: revision.description,
        authorAdminId: revision.authorAdminId,
        createdAt: revision.createdAt,
      },
    });
  }

  async listForRecipient(careRecipientId: string, limit: number): Promise<CarePlanRevision[]> {
    const rows = await this.prisma.carePlanRevision.findMany({
      where: { careRecipientId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((row) =>
      CarePlanRevision.rehydrate(row.id, {
        careRecipientId: row.careRecipientId,
        description: row.description,
        authorAdminId: row.authorAdminId,
        createdAt: row.createdAt,
      }),
    );
  }
}
