import { Clock } from '@shared/application/ports/clock.port';
import { ValidationException } from '@shared/domain/domain-exception';
import { EmergencyContact } from '../../domain/emergency-contact.entity';
import { EmergencyContactRepository } from '../../domain/emergency-contact.repository';
import {
  GetEmergencyContactUseCase,
  SetEmergencyContactUseCase,
} from './emergency-contact.use-cases';

const clock: Clock = { now: () => new Date('2026-09-05T00:00:00.000Z') };

class InMemoryEmergencyContactRepository implements EmergencyContactRepository {
  public store = new Map<string, EmergencyContact>();
  findByUser(userId: string): Promise<EmergencyContact | null> {
    return Promise.resolve(this.store.get(userId) ?? null);
  }
  save(contact: EmergencyContact): Promise<void> {
    this.store.set(contact.id, contact);
    return Promise.resolve();
  }
}

describe('emergency contact', () => {
  it('returns null until set, then reads back the saved contact', async () => {
    const repo = new InMemoryEmergencyContactRepository();
    expect(await new GetEmergencyContactUseCase(repo).execute({ userId: 'u1' })).toBeNull();

    await new SetEmergencyContactUseCase(repo, clock).execute({
      userId: 'u1',
      name: 'Grace',
      phone: '+2348012345678',
      relationship: 'Sister',
    });

    const result = await new GetEmergencyContactUseCase(repo).execute({ userId: 'u1' });
    expect(result).toEqual({ name: 'Grace', phone: '+2348012345678', relationship: 'Sister' });
  });

  it('rejects a blank name', async () => {
    await expect(
      new SetEmergencyContactUseCase(new InMemoryEmergencyContactRepository(), clock).execute({
        userId: 'u1',
        name: '  ',
        phone: '+2348012345678',
        relationship: 'Sister',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
