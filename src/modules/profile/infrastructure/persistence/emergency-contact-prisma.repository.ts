import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { EmergencyContact } from '../../domain/emergency-contact.entity';
import { EmergencyContactRepository } from '../../domain/emergency-contact.repository';

/** Prisma backed adapter for the EmergencyContactRepository port. */
@Injectable()
export class EmergencyContactPrismaRepository implements EmergencyContactRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(userId: string): Promise<EmergencyContact | null> {
    const row = await this.prisma.emergencyContact.findUnique({ where: { userId } });
    return row === null
      ? null
      : EmergencyContact.rehydrate(row.userId, {
          name: row.name,
          phone: row.phone,
          relationship: row.relationship,
          updatedAt: row.updatedAt,
        });
  }

  async save(contact: EmergencyContact): Promise<void> {
    const data = { name: contact.name, phone: contact.phone, relationship: contact.relationship };
    await this.prisma.emergencyContact.upsert({
      where: { userId: contact.id },
      create: { userId: contact.id, ...data },
      update: data,
    });
  }
}
