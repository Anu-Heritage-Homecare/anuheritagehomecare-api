import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { AttachmentRepository } from '../../domain/attachment.repository';

/** Prisma adapter for the AttachmentRepository port. */
@Injectable()
export class AttachmentPrismaRepository implements AttachmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async deleteById(id: string): Promise<void> {
    await this.prisma.messageAttachment.delete({ where: { id } });
  }
}
