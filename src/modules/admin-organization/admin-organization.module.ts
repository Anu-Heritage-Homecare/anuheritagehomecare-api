import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import {
  AddBranchUseCase,
  DeleteBranchUseCase,
  UpdateBranchUseCase,
} from './application/use-cases/branch.use-cases';
import {
  AddEmergencyContactUseCase,
  DeleteEmergencyContactUseCase,
  UpdateEmergencyContactUseCase,
} from './application/use-cases/emergency-contact.use-cases';
import { GetOrganizationUseCase } from './application/use-cases/get-organization.use-case';
import { SetBusinessHoursUseCase } from './application/use-cases/set-business-hours.use-case';
import { UpdateOrganizationProfileUseCase } from './application/use-cases/update-organization-profile.use-case';
import {
  CreateApiKeyUseCase,
  GetApiKeyUseCase,
  ListApiKeysUseCase,
  RegenerateApiKeyUseCase,
  RevokeApiKeyUseCase,
} from './application/use-cases/api-key.use-cases';
import { AuthenticateApiKeyUseCase } from './application/use-cases/authenticate-api-key.use-case';
import { ORGANIZATION_REPOSITORY } from './domain/organization.repository';
import { API_KEY_REPOSITORY } from './domain/api-key.repository';
import { OrganizationPrismaRepository } from './infrastructure/persistence/organization.prisma.repository';
import { ApiKeyPrismaRepository } from './infrastructure/persistence/api-key.prisma.repository';
import { OrganizationController } from './presentation/organization.controller';
import { ApiKeyController } from './presentation/api-key.controller';
import { ApiKeyAuthGuard } from './presentation/api-key-auth.guard';
import { PartnerApiController } from './presentation/partner-api.controller';

/**
 * Admin Organization bounded context composition root. Powers Settings >
 * Organization Profile: the singleton organization, its weekly schedule, its
 * branches, its emergency contacts and its programmatic API keys. Also hosts the
 * external partner API, which authenticates callers by API key.
 */
@Module({
  imports: [PassportModule],
  controllers: [OrganizationController, ApiKeyController, PartnerApiController],
  providers: [
    GetOrganizationUseCase,
    UpdateOrganizationProfileUseCase,
    SetBusinessHoursUseCase,
    AddBranchUseCase,
    UpdateBranchUseCase,
    DeleteBranchUseCase,
    AddEmergencyContactUseCase,
    UpdateEmergencyContactUseCase,
    DeleteEmergencyContactUseCase,
    CreateApiKeyUseCase,
    ListApiKeysUseCase,
    GetApiKeyUseCase,
    RegenerateApiKeyUseCase,
    RevokeApiKeyUseCase,
    AuthenticateApiKeyUseCase,
    ApiKeyAuthGuard,
    { provide: ORGANIZATION_REPOSITORY, useClass: OrganizationPrismaRepository },
    { provide: API_KEY_REPOSITORY, useClass: ApiKeyPrismaRepository },
  ],
})
export class AdminOrganizationModule {}
