import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { PHOTO_STORAGE, PhotoStorage } from '@shared/application/ports/photo-storage.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface DownloadVisitPhotosQuery {
  ownerId: string;
  visitId: string;
}

export interface DownloadedPhoto {
  name: string;
  data: Buffer;
}

export interface DownloadVisitPhotosResult {
  filename: string;
  files: DownloadedPhoto[];
}

/**
 * Use case: gather all of a visit's photos for a single archive download. The
 * visit's recipient must belong to the owner, otherwise it is reported as not
 * found so another family's photos are never disclosed. Each photo is fetched
 * from the object store; the presentation layer packs them into a zip.
 */
@Injectable()
export class DownloadVisitPhotosUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(PHOTO_STORAGE) private readonly photoStorage: PhotoStorage,
  ) {}

  async execute(query: DownloadVisitPhotosQuery): Promise<DownloadVisitPhotosResult> {
    const visit = await this.visits.findById(query.visitId);
    if (visit === null) {
      throw new NotFoundDomainException('Visit not found');
    }
    const recipient = await this.recipients.findById(visit.careRecipientId);
    if (recipient === null || recipient.ownerId !== query.ownerId) {
      throw new NotFoundDomainException('Visit not found');
    }

    const files = await Promise.all(
      visit.photoKeys.map(async (key, index) => ({
        name: `photo-${index + 1}.jpg`,
        data: await this.photoStorage.download(key),
      })),
    );

    return { filename: `visit-${query.visitId}-photos.zip`, files };
  }
}
