import { Global, Module } from '@nestjs/common';
import { CLOCK } from './application/ports/clock.port';
import { EMAIL_SENDER } from './application/ports/email-sender.port';
import { ID_GENERATOR } from './application/ports/id-generator.port';
import { PHOTO_STORAGE } from './application/ports/photo-storage.port';
import { NodemailerEmailSender } from './infrastructure/email/nodemailer-email-sender';
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
    { provide: EMAIL_SENDER, useClass: NodemailerEmailSender },
  ],
  exports: [CLOCK, ID_GENERATOR, PHOTO_STORAGE, EMAIL_SENDER],
})
export class SharedModule {}
