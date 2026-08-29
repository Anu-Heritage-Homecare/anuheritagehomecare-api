import { Global, Module } from '@nestjs/common';
import { CLOCK } from './application/ports/clock.port';
import { ID_GENERATOR } from './application/ports/id-generator.port';
import { PHOTO_STORAGE } from './application/ports/photo-storage.port';
import { CloudinaryPhotoStorage } from './infrastructure/storage/cloudinary-photo-storage';
import { SystemClock } from './infrastructure/system/system-clock';
import { UuidGenerator } from './infrastructure/system/uuid-generator';

/**
 * Cross cutting technical providers shared by every bounded context. Bound to
 * ports so consumers depend on interfaces, not concrete implementations.
 */
@Global()
@Module({
  providers: [
    { provide: CLOCK, useClass: SystemClock },
    { provide: ID_GENERATOR, useClass: UuidGenerator },
    { provide: PHOTO_STORAGE, useClass: CloudinaryPhotoStorage },
  ],
  exports: [CLOCK, ID_GENERATOR, PHOTO_STORAGE],
})
export class SharedModule {}
