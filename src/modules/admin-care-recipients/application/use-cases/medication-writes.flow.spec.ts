import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { MedicationStatus } from '@modules/care-recipients/domain/medication-status.enum';
import { MedicationAudit } from '@modules/care-recipients/domain/medication-audit.entity';
import { MedicationAuditRepository } from '@modules/care-recipients/domain/medication-audit.repository';
import { MedicationWarning } from '@modules/care-recipients/domain/medication-warning.entity';
import { MedicationWarningRepository } from '@modules/care-recipients/domain/medication-warning.repository';
import { RecipientProfile } from '@modules/care-recipients/domain/value-objects/recipient-profile.vo';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AddMedicationUseCase } from './add-medication.use-case';
import { DiscontinueMedicationUseCase } from './discontinue-medication.use-case';
import { SetMedicationWarningsUseCase } from './set-medication-warnings.use-case';
import { UpdateMedicationUseCase } from './update-medication.use-case';

const NOW = new Date('2026-09-13T00:00:00.000Z');
const clock: Clock = { now: () => NOW };
const R = 'r1';

function ids(): IdGenerator {
  let n = 0;
  return { generate: () => `id-${(n += 1)}` };
}

function makeRecipient(): CareRecipient {
  const profile = RecipientProfile.create({
    name: 'Margaret Johnson',
    gender: 'FEMALE',
    dateOfBirth: new Date('1948-01-01T00:00:00.000Z'),
    city: 'Boston',
    state: 'MA',
    fullAddress: '1 Main St',
    relationship: 'Mother',
    livingSituation: 'At home',
    photoKey: null,
    latitude: null,
    longitude: null,
  });
  return CareRecipient.provisionByAdmin({ id: R, ownerId: 'owner1', profile, now: NOW });
}

class RecipientStore implements CareRecipientRepository {
  constructor(private recipient: CareRecipient | null) {}
  save(recipient: CareRecipient): Promise<void> {
    this.recipient = recipient;
    return Promise.resolve();
  }
  findById(id: string): Promise<CareRecipient | null> {
    return Promise.resolve(this.recipient !== null && id === R ? this.recipient : null);
  }
  findByIds(): Promise<CareRecipient[]> {
    return Promise.resolve([]);
  }
  listByOwner(): Promise<CareRecipient[]> {
    return Promise.resolve([]);
  }
  get current(): CareRecipient | null {
    return this.recipient;
  }
}

class AuditStore implements MedicationAuditRepository {
  public readonly entries: MedicationAudit[] = [];
  add(audit: MedicationAudit): Promise<void> {
    this.entries.push(audit);
    return Promise.resolve();
  }
  listForRecipient(): Promise<MedicationAudit[]> {
    return Promise.resolve([...this.entries]);
  }
}

class WarningStore implements MedicationWarningRepository {
  public warnings: MedicationWarning[] = [];
  replaceForRecipient(_id: string, warnings: MedicationWarning[]): Promise<void> {
    this.warnings = warnings;
    return Promise.resolve();
  }
  listForRecipient(): Promise<MedicationWarning[]> {
    return Promise.resolve(this.warnings);
  }
}

describe('medication admin writes', () => {
  it('adds a prescription and records an audit entry attributed to the admin', async () => {
    const store = new RecipientStore(makeRecipient());
    const audits = new AuditStore();
    const useCase = new AddMedicationUseCase(store, audits, clock, ids());

    const { id } = await useCase.execute({
      recipientId: R,
      adminId: 'admin-1',
      name: 'Donepezil',
      dose: '10mg',
      doseTimes: [480],
      note: 'Authorized by Dr. Sarah Kim',
    });

    const meds = store.current?.medications ?? [];
    expect(meds).toHaveLength(1);
    expect(meds[0].id).toBe(id);
    expect(meds[0].name).toBe('Donepezil');
    expect(audits.entries[0].title).toBe('Donepezil 10mg added');
    expect(audits.entries[0].detail).toBe('Authorized by Dr. Sarah Kim');
    expect(audits.entries[0].authorAdminId).toBe('admin-1');
  });

  it('edits a prescription while preserving its identity and status', async () => {
    const store = new RecipientStore(makeRecipient());
    const audits = new AuditStore();
    const idGen = ids();
    const addId = (
      await new AddMedicationUseCase(store, audits, clock, idGen).execute({
        recipientId: R,
        adminId: 'admin-1',
        name: 'Metformin',
        dose: '500mg',
      })
    ).id;

    await new UpdateMedicationUseCase(store, audits, clock, idGen).execute({
      recipientId: R,
      medicationId: addId,
      adminId: 'admin-1',
      name: 'Metformin',
      dose: '1000mg',
      doseTimes: [480, 1020],
    });

    const med = store.current?.findMedication(addId);
    expect(med?.dose).toBe('1000mg');
    expect(med?.doseTimes).toEqual([480, 1020]);
    expect(med?.status).toBe(MedicationStatus.Active);
    expect(audits.entries.at(-1)?.title).toBe('Metformin updated');
  });

  it('discontinues a prescription without deleting it', async () => {
    const store = new RecipientStore(makeRecipient());
    const audits = new AuditStore();
    const idGen = ids();
    const addId = (
      await new AddMedicationUseCase(store, audits, clock, idGen).execute({
        recipientId: R,
        adminId: 'admin-1',
        name: 'OldMed',
      })
    ).id;

    await new DiscontinueMedicationUseCase(store, audits, clock, idGen).execute({
      recipientId: R,
      medicationId: addId,
      adminId: 'admin-1',
    });

    const med = store.current?.findMedication(addId);
    expect(med?.status).toBe(MedicationStatus.Discontinued);
    expect(med?.discontinuedAt).toEqual(NOW);
    expect(audits.entries.at(-1)?.title).toBe('OldMed discontinued');
  });

  it('rejects editing a medication that does not exist', async () => {
    const store = new RecipientStore(makeRecipient());
    const useCase = new UpdateMedicationUseCase(store, new AuditStore(), clock, ids());
    await expect(
      useCase.execute({ recipientId: R, medicationId: 'missing', adminId: 'admin-1', name: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('replaces the clinical warning profile and records an audit', async () => {
    const store = new RecipientStore(makeRecipient());
    const audits = new AuditStore();
    const warnings = new WarningStore();
    const useCase = new SetMedicationWarningsUseCase(store, warnings, audits, clock, ids());

    const result = await useCase.execute({
      recipientId: R,
      adminId: 'admin-1',
      warnings: [
        { title: 'Donepezil + Memantine Interaction', detail: 'Moderate risk. Monitor closely.' },
      ],
    });

    expect(result.warningCount).toBe(1);
    expect(warnings.warnings[0].title).toBe('Donepezil + Memantine Interaction');
    expect(audits.entries[0].title).toBe('Clinical warnings updated');
  });

  it('rejects setting warnings for an unknown recipient', async () => {
    const useCase = new SetMedicationWarningsUseCase(
      new RecipientStore(null),
      new WarningStore(),
      new AuditStore(),
      clock,
      ids(),
    );
    await expect(
      useCase.execute({ recipientId: 'nope', adminId: 'admin-1', warnings: [] }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
