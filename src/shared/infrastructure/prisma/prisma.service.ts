import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Ensure the connection pool is large enough for the parallel queries each
 * request fires, without exhausting a managed database's own connection cap.
 * Defaults to 10 (override with DATABASE_CONNECTION_LIMIT); left untouched if the
 * URL already pins a limit.
 */
function withPoolSettings(url: string | undefined): string | undefined {
  if (url === undefined || url.includes('connection_limit')) {
    return url;
  }
  const limit = process.env.DATABASE_CONNECTION_LIMIT ?? '10';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}connection_limit=${limit}&pool_timeout=20`;
}

/**
 * Thin wrapper around the generated Prisma client that ties its connection
 * lifecycle to the Nest module lifecycle. Repositories in each bounded context
 * depend on this service; nothing in the domain layer imports it.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasourceUrl: withPoolSettings(process.env.DATABASE_URL),
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected to the database');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from the database');
  }
}
