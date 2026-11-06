import { Global, Module } from '@nestjs/common';
import { BILLING_ACCOUNT_EVENT_RECORDER } from './application/ports/billing-account-event-recorder.port';
import { CLOCK } from './application/ports/clock.port';
import { DOCUMENT_STORAGE } from './application/ports/document-storage.port';
import { EMAIL_SENDER } from './application/ports/email-sender.port';
import { ID_GENERATOR } from './application/ports/id-generator.port';
import { PHOTO_STORAGE } from './application/ports/photo-storage.port';
import { PrismaBillingAccountEventRecorder } from './infrastructure/billing/prisma-billing-account-event-recorder';
import { NodemailerEmailSender } from './infrastructure/email/nodemailer-email-sender';
import { CloudinaryDocumentStorage } from './infrastructure/storage/cloudinary-document-storage';
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
    { provide: DOCUMENT_STORAGE, useClass: CloudinaryDocumentStorage },
    { provide: EMAIL_SENDER, useClass: NodemailerEmailSender },
    { provide: BILLING_ACCOUNT_EVENT_RECORDER, useClass: PrismaBillingAccountEventRecorder },
  ],
  exports: [
    CLOCK,
    ID_GENERATOR,
    PHOTO_STORAGE,
    DOCUMENT_STORAGE,
    EMAIL_SENDER,
    BILLING_ACCOUNT_EVENT_RECORDER,
  ],
})
export class SharedModule {}
