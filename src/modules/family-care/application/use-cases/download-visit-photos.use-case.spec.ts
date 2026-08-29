import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { VisitRepository } from '@modules/visits/domain/visit.repository';
import { buildVisit } from '@modules/visits/test-support/doubles';
import { PhotoStorage } from '@shared/application/ports/photo-storage.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { DownloadVisitPhotosUseCase } from './download-visit-photos.use-case';

function visitsRepo(): VisitRepository {
  const visit = buildVisit({
    id: 'v1',
    careRecipientId: 'r1',
    status: VisitStatus.Completed,
    photoKeys: ['anu/visits/v1/a', 'anu/visits/v1/b'],
  });
  return {
    findById: (id: string) => Promise.resolve(id === 'v1' ? visit : null),
  } as unknown as VisitRepository;
}

function recipientsRepo(ownerId: string): CareRecipientRepository {
  return {
    findById: (id: string) =>
      Promise.resolve(id === 'r1' ? ({ id: 'r1', ownerId } as unknown as CareRecipient) : null),
  } as unknown as CareRecipientRepository;
}

const photoStorage: PhotoStorage = {
  createUploadTicket: () => ({ uploadUrl: '', fields: {}, key: '' }),
  urlFor: (key: string) => `https://cdn/${key}`,
  download: (key: string) => Promise.resolve(Buffer.from(`bytes:${key}`)),
};

describe('DownloadVisitPhotosUseCase', () => {
  it('gathers every photo for an owned visit', async () => {
    const useCase = new DownloadVisitPhotosUseCase(
      visitsRepo(),
      recipientsRepo('owner-1'),
      photoStorage,
    );

    const result = await useCase.execute({ ownerId: 'owner-1', visitId: 'v1' });

    expect(result.filename).toBe('visit-v1-photos.zip');
    expect(result.files).toEqual([
      { name: 'photo-1.jpg', data: Buffer.from('bytes:anu/visits/v1/a') },
      { name: 'photo-2.jpg', data: Buffer.from('bytes:anu/visits/v1/b') },
    ]);
  });

  it('hides a visit whose recipient the owner does not own', async () => {
    const useCase = new DownloadVisitPhotosUseCase(
      visitsRepo(),
      recipientsRepo('someone-else'),
      photoStorage,
    );

    await expect(useCase.execute({ ownerId: 'owner-1', visitId: 'v1' })).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });
});
