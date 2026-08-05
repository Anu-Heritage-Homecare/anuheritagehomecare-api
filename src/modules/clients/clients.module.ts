import { Module } from '@nestjs/common';
import { GetClientByIdUseCase } from './application/use-cases/get-client-by-id.use-case';
import { RegisterClientUseCase } from './application/use-cases/register-client.use-case';
import { CLIENT_REPOSITORY } from './domain/client.repository';
import { ClientPrismaRepository } from './infrastructure/persistence/client-prisma.repository';
import { ClientsController } from './presentation/clients.controller';

/**
 * Clients bounded context composition root. The domain port (CLIENT_REPOSITORY)
 * is bound to its Prisma adapter here, so every other layer depends only on the
 * abstraction.
 */
@Module({
  controllers: [ClientsController],
  providers: [
    RegisterClientUseCase,
    GetClientByIdUseCase,
    { provide: CLIENT_REPOSITORY, useClass: ClientPrismaRepository },
  ],
})
export class ClientsModule {}
