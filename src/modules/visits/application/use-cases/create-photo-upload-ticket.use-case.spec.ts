import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { PhotoStorage } from '@shared/application/ports/photo-storage.port';
import { VisitStatus } from '../../domain/visit-status.enum';
import { InMemoryVisitRepository, buildVisit, fixedClock } from '../../test-support/doubles';
import { CreatePhotoUploadTicketUseCase } from './create-photo-upload-ticket.use-case';

describe('CreatePhotoUploadTicketUseCase', () => {
  const ids: IdGenerator = { generate: () => 'photo-1' };
  let storage: PhotoStorage;
  let createUploadTicket: jest.Mock;
  let visits: InMemoryVisitRepository;
  let useCase: CreatePhotoUploadTicketUseCase;

  beforeEach(() => {
    createUploadTicket = jest.fn(() => ({ uploadUrl: 'https://upload', fields: {}, key: 'k' }));
    storage = {
      createUploadTicket,
      urlFor: () => '',
      download: () => Promise.resolve(Buffer.alloc(0)),
    };
    visits = new InMemoryVisitRepository();
    useCase = new CreatePhotoUploadTicketUseCase(visits, storage, ids, fixedClock);
  });

  it('issues a ticket referencing the visit for the owning caregiver', async () => {
    await visits.save(
      buildVisit({ id: 'v1', caregiverId: 'caregiver-1', status: VisitStatus.InProgress }),
    );

    await useCase.execute({ caregiverId: 'caregiver-1', visitId: 'v1' });

    expect(createUploadTicket).toHaveBeenCalledWith({
      reference: 'v1/photo-1',
      now: fixedClock.now(),
    });
  });

  it('reports a visit owned by another caregiver as not found', async () => {
    await visits.save(
      buildVisit({ id: 'v1', caregiverId: 'someone-else', status: VisitStatus.InProgress }),
    );

    await expect(
      useCase.execute({ caregiverId: 'caregiver-1', visitId: 'v1' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
    expect(createUploadTicket).not.toHaveBeenCalled();
  });
});
