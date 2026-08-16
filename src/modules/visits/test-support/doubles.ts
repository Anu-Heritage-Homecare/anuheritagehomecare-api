import { ConfigService } from '@nestjs/config';
import { Clock } from '@shared/application/ports/clock.port';
import {
  CareRecipientDirectory,
  RecipientSnapshot,
} from '../application/ports/care-recipient-directory.port';
import {
  OwnerContact,
  OwnerContactDirectory,
} from '../application/ports/owner-contact-directory.port';
import { VisitStatus } from '../domain/visit-status.enum';
import { Visit } from '../domain/visit.entity';
import { VisitRepository } from '../domain/visit.repository';
import { VisitTask } from '../domain/value-objects/visit-task.vo';
import { VisitWindow } from '../domain/value-objects/visit-window.vo';

export const FIXED_NOW = new Date('2026-07-12T12:00:00.000Z');
export const fixedClock: Clock = { now: () => FIXED_NOW };

/** A ConfigService that only answers the geofence radius the use cases read. */
export function fakeGeofenceConfig(radiusMeters = 150): ConfigService {
  return { getOrThrow: () => ({ radiusMeters }) } as unknown as ConfigService;
}

interface BuildVisitOptions {
  id?: string;
  caregiverId?: string;
  careRecipientId?: string;
  date?: string;
  startMinute?: number;
  endMinute?: number;
  status?: VisitStatus;
  tasks?: { label: string; completed: boolean }[];
  specialInstructions?: string[];
}

/** Build a Visit aggregate for specs, in any status. */
export function buildVisit(options: BuildVisitOptions = {}): Visit {
  const id = options.id ?? 'visit-1';
  const caregiverId = options.caregiverId ?? 'caregiver-1';
  const careRecipientId = options.careRecipientId ?? 'recipient-1';
  const scheduledDate = new Date(`${options.date ?? '2026-07-12'}T00:00:00.000Z`);
  const window = VisitWindow.create(options.startMinute ?? 9 * 60, options.endMinute ?? 10 * 60);
  const tasks = (options.tasks ?? []).map((task) => VisitTask.create(task.label, task.completed));

  const visit = Visit.schedule({
    id,
    caregiverId,
    careRecipientId,
    scheduledDate,
    window,
    tasks,
    specialInstructions: options.specialInstructions ?? [],
    now: FIXED_NOW,
  });

  const status = options.status ?? VisitStatus.Scheduled;
  if (status === VisitStatus.Scheduled) {
    return visit;
  }

  return Visit.rehydrate(id, {
    caregiverId,
    careRecipientId,
    scheduledDate,
    window,
    status,
    tasks,
    specialInstructions: visit.specialInstructions,
    clockInAt: null,
    clockOutAt: null,
    arrivalLocation: null,
    createdAt: visit.createdAt,
    updatedAt: visit.updatedAt,
  });
}

/** Build a recipient snapshot for the directory double. */
export function buildSnapshot(overrides: Partial<RecipientSnapshot> = {}): RecipientSnapshot {
  return {
    id: 'recipient-1',
    ownerId: 'owner-1',
    name: 'Eleanor Ross',
    gender: 'FEMALE',
    dateOfBirth: new Date('1944-01-01T00:00:00.000Z'),
    fullAddress: '123 Maple Street, Sunnyvale, CA 94086',
    careNeeds: ['MEAL_PREPARATION', 'HOUSEKEEPING'],
    medicalConditions: ['Diabetes', 'High Fall Risk'],
    allergies: ['Penicillin Allergy'],
    photoKey: null,
    latitude: 37.3861,
    longitude: -122.0839,
    ...overrides,
  };
}

export class InMemoryVisitRepository implements VisitRepository {
  public readonly store = new Map<string, Visit>();

  save(visit: Visit): Promise<void> {
    this.store.set(visit.id, visit);
    return Promise.resolve();
  }

  findById(id: string): Promise<Visit | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }

  listForCaregiverInRange(caregiverId: string, from: Date, to: Date): Promise<Visit[]> {
    const matches = [...this.store.values()]
      .filter(
        (visit) =>
          visit.caregiverId === caregiverId &&
          visit.scheduledDate.getTime() >= from.getTime() &&
          visit.scheduledDate.getTime() <= to.getTime(),
      )
      .sort((a, b) => {
        const byDate = a.scheduledDate.getTime() - b.scheduledDate.getTime();
        return byDate !== 0 ? byDate : a.window.startMinute - b.window.startMinute;
      });
    return Promise.resolve(matches);
  }
}

export class FakeCareRecipientDirectory implements CareRecipientDirectory {
  private readonly snapshots = new Map<string, RecipientSnapshot>();

  add(snapshot: RecipientSnapshot): void {
    this.snapshots.set(snapshot.id, snapshot);
  }

  lookup(ids: string[]): Promise<Map<string, RecipientSnapshot>> {
    const result = new Map<string, RecipientSnapshot>();
    for (const id of ids) {
      const snapshot = this.snapshots.get(id);
      if (snapshot !== undefined) {
        result.set(id, snapshot);
      }
    }
    return Promise.resolve(result);
  }
}

export class FakeOwnerContactDirectory implements OwnerContactDirectory {
  private readonly contacts = new Map<string, OwnerContact>();

  set(ownerId: string, contact: OwnerContact): void {
    this.contacts.set(ownerId, contact);
  }

  findContact(ownerId: string): Promise<OwnerContact | null> {
    return Promise.resolve(this.contacts.get(ownerId) ?? null);
  }
}
