import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { FamilyDirectoryModule } from '@modules/family-directory/family-directory.module';
import { FAMILY_DIRECTORY_READ_MODEL } from './application/ports/family-directory-read.port';
import { GetFamiliesKpisUseCase } from './application/use-cases/get-families-kpis.use-case';
import { GetFamilyDetailUseCase } from './application/use-cases/get-family-detail.use-case';
import { ListFamiliesUseCase } from './application/use-cases/list-families.use-case';
import { FamilyDirectoryReadPrisma } from './infrastructure/persistence/family-directory-read.prisma';
import { AdminFamiliesController } from './presentation/admin-families.controller';

/**
 * Admin Families panel. Reads the family directory overlay and composes it with the
 * identity accounts, linked recipients and billing. Separate admin auth applies at
 * the controller.
 */
@Module({
  imports: [PassportModule, FamilyDirectoryModule],
  controllers: [AdminFamiliesController],
  providers: [
    ListFamiliesUseCase,
    GetFamiliesKpisUseCase,
    GetFamilyDetailUseCase,
    { provide: FAMILY_DIRECTORY_READ_MODEL, useClass: FamilyDirectoryReadPrisma },
  ],
})
export class AdminFamiliesModule {}
