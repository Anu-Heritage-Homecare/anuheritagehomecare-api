import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { LoginEvent } from '../../domain/login-event.entity';
import { LoginEventRepository } from '../../domain/login-event.repository';
import { LoginEventMapper } from './login-event.mapper';

/** Prisma backed adapter for the LoginEventRepository port. */
@Injectable()
export class LoginEventPrismaRepository implements LoginEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(event: LoginEvent): Promise<void> {
    await this.prisma.loginEvent.create({ data: LoginEventMapper.toPersistence(event) });
  }

  async listRecentForUser(userId: string, limit: number): Promise<LoginEvent[]> {
    const rows = await this.prisma.loginEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => LoginEventMapper.toDomain(row));
  }
}
