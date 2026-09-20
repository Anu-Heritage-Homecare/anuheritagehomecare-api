import { Module } from '@nestjs/common';
import { FAMILY_DIRECTORY_ENTRY_REPOSITORY } from './domain/family-directory-entry.repository';
import { FamilyDirectoryEntryPrismaRepository } from './infrastructure/persistence/family-directory-entry-prisma.repository';

/**
 * Family directory bounded context: the admin overlay behind the Families screen.
 * The repository is exported so the admin families panel can read and drive the
 * directory entries.
 */
@Module({
  providers: [
    {
      provide: FAMILY_DIRECTORY_ENTRY_REPOSITORY,
      useClass: FamilyDirectoryEntryPrismaRepository,
    },
  ],
  exports: [FAMILY_DIRECTORY_ENTRY_REPOSITORY],
})
export class FamilyDirectoryModule {}
