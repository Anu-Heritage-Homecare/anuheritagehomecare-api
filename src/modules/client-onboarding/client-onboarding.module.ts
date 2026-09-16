import { Module } from '@nestjs/common';
import { CLIENT_APPLICATION_REPOSITORY } from './domain/client-application.repository';
import { ClientApplicationPrismaRepository } from './infrastructure/persistence/client-application-prisma.repository';

/**
 * Client onboarding bounded context: the lifecycle funnel behind the admin Plans
 * and Billing pipeline. The repository is exported so the admin panel can drive the
 * application actions without depending on the context internals.
 */
@Module({
  providers: [
    { provide: CLIENT_APPLICATION_REPOSITORY, useClass: ClientApplicationPrismaRepository },
  ],
  exports: [CLIENT_APPLICATION_REPOSITORY],
})
export class ClientOnboardingModule {}
