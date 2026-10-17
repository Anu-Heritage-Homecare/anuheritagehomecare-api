import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { PhotoStorage } from '@shared/application/ports/photo-storage.port';
import { CreateCareRecipientPhotoTicketUseCase } from './create-care-recipient-photo-ticket.use-case';

describe('CreateCareRecipientPhotoTicketUseCase', () => {
  const clock: Clock = { now: () => new Date('2026-02-01T00:00:00.000Z') };
  const ids: IdGenerator = { generate: () => 'photo-1' };
  let createUploadTicket: jest.Mock;
  let storage: PhotoStorage;
  let useCase: CreateCareRecipientPhotoTicketUseCase;

  beforeEach(() => {
    createUploadTicket = jest.fn(() => ({ uploadUrl: 'https://upload', fields: {}, key: 'k' }));
    storage = {
      createUploadTicket,
      urlFor: () => '',
      download: () => Promise.resolve(Buffer.alloc(0)),
    };
    useCase = new CreateCareRecipientPhotoTicketUseCase(storage, ids, clock);
  });

  it('issues a ticket under the owner scoped care-recipients photo namespace', () => {
    const ticket = useCase.execute({ ownerId: 'owner-1' });

    expect(createUploadTicket).toHaveBeenCalledWith({
      reference: 'care-recipients/photos/owner-1/photo-1',
      now: clock.now(),
    });
    expect(ticket.key).toBe('k');
  });
});
