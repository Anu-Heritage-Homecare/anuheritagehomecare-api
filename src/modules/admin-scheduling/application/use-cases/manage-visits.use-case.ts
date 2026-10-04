import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import {
  CERTIFICATION_REPOSITORY,
  CertificationRepository,
} from '@modules/certifications/domain/certification.repository';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { VisitPriority } from '@modules/visits/domain/visit-priority.enum';
import { VisitType } from '@modules/visits/domain/visit-type.enum';
import { Visit } from '@modules/visits/domain/visit.entity';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { VisitTask } from '@modules/visits/domain/value-objects/visit-task.vo';
import { VisitWindow } from '@modules/visits/domain/value-objects/visit-window.vo';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { SchedulingSettings } from '../../domain/scheduling-settings.entity';
import {
  SCHEDULING_SETTINGS_REPOSITORY,
  SchedulingHolidayData,
  SchedulingSettingsRepository,
} from '../../domain/scheduling-settings.repository';
import {
  assertSchedulable,
  fallbackDurationMinutes,
  requiredCertificationFor,
} from '../scheduling-rules.util';

const DAY_MS = 86_400_000;
const INACTIVE = new Set(['CANCELLED', 'MISSED']);

/** Load the settings singleton (or defaults) and the holiday calendar together. */
async function loadSettings(
  repo: SchedulingSettingsRepository,
  now: Date,
): Promise<{ settings: SchedulingSettings; holidays: SchedulingHolidayData[] }> {
  const settings = (await repo.find()) ?? SchedulingSettings.createDefault(now);
  const holidays = await repo.listHolidays();
  return { settings, holidays };
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export interface ScheduleVisitCommand {
  careRecipientId: string;
  caregiverId: string | null;
  scheduledDate: Date;
  startMinute: number;
  endMinute: number | null;
  visitType: VisitType;
  priority: VisitPriority | undefined;
  tasks: string[];
  specialInstructions: string[];
}

/** Schedule (create) a new visit, either assigned to a caregiver or unassigned. */
@Injectable()
export class ScheduleVisitUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SCHEDULING_SETTINGS_REPOSITORY) private readonly settings: SchedulingSettingsRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ScheduleVisitCommand): Promise<{ id: string }> {
    const recipient = await this.recipients.findById(command.careRecipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }
    if (command.caregiverId !== null) {
      const caregiver = await this.users.findById(command.caregiverId);
      if (caregiver === null || caregiver.userType !== UserType.Caregiver) {
        throw new ValidationException('The assigned user is not a caregiver');
      }
    }

    const now = this.clock.now();
    const { settings, holidays } = await loadSettings(this.settings, now);
    const priority = command.priority ?? VisitPriority.Normal;
    // Apply the configured default duration when no explicit end time is given.
    const endMinute =
      command.endMinute ??
      command.startMinute +
        settings.defaultDurationMinutes(
          String(command.visitType),
          fallbackDurationMinutes(String(command.visitType)),
        );
    assertSchedulable(
      settings,
      holidays,
      command.scheduledDate,
      command.startMinute,
      endMinute,
      priority,
    );

    const window = VisitWindow.create(command.startMinute, endMinute);
    const tasks = command.tasks.map((label) => VisitTask.create(label));
    const id = this.ids.generate();

    const visit =
      command.caregiverId === null
        ? Visit.scheduleUnassigned({
            id,
            careRecipientId: command.careRecipientId,
            scheduledDate: command.scheduledDate,
            window,
            type: command.visitType,
            priority: command.priority,
            tasks,
            specialInstructions: command.specialInstructions,
            now,
          })
        : Visit.schedule({
            id,
            caregiverId: command.caregiverId,
            careRecipientId: command.careRecipientId,
            scheduledDate: command.scheduledDate,
            window,
            type: command.visitType,
            priority: command.priority,
            tasks,
            specialInstructions: command.specialInstructions,
            now,
          });

    await this.visits.save(visit);
    return { id: visit.id };
  }
}

/** Assign (or reassign) a caregiver to a scheduled visit. */
@Injectable()
export class AssignVisitCaregiverUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CERTIFICATION_REPOSITORY) private readonly certifications: CertificationRepository,
    @Inject(SCHEDULING_SETTINGS_REPOSITORY) private readonly settings: SchedulingSettingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: { visitId: string; caregiverId: string }): Promise<{ assignedAt: Date }> {
    const visit = await this.visits.findById(command.visitId);
    if (visit === null) {
      throw new NotFoundDomainException('Visit not found');
    }
    const caregiver = await this.users.findById(command.caregiverId);
    if (caregiver === null || caregiver.userType !== UserType.Caregiver) {
      throw new ValidationException('The assigned user is not a caregiver');
    }

    const now = this.clock.now();
    const { settings } = await loadSettings(this.settings, now);
    await this.enforceCertification(settings, visit, command.caregiverId, now);
    await this.enforceBuffer(settings, visit, command.caregiverId);

    visit.assignCaregiver(command.caregiverId, now);
    await this.visits.save(visit);
    return { assignedAt: now };
  }

  private async enforceCertification(
    settings: SchedulingSettings,
    visit: Visit,
    caregiverId: string,
    now: Date,
  ): Promise<void> {
    const requiredCert = requiredCertificationFor(String(visit.type));
    if (!settings.rules.requireCertificationMatch || requiredCert === null) {
      return;
    }
    const certs = await this.certifications.listForCaregiver(caregiverId);
    const hasValid = certs.some(
      (c) =>
        c.name.toLowerCase().includes(requiredCert.toLowerCase()) &&
        c.expiresAt.getTime() > now.getTime(),
    );
    if (!hasValid) {
      throw new ValidationException(`The caregiver lacks a valid ${requiredCert} certification`);
    }
  }

  private async enforceBuffer(
    settings: SchedulingSettings,
    visit: Visit,
    caregiverId: string,
  ): Promise<void> {
    if (settings.travel.allowBackToBackVisits) {
      return;
    }
    const buffer = settings.travel.minBufferMinutes;
    const dayStart = startOfUtcDay(visit.scheduledDate);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const existing = await this.visits.listForCaregiverInRange(caregiverId, dayStart, dayEnd);
    const clash = existing.some(
      (v) =>
        v.id !== visit.id &&
        !INACTIVE.has(String(v.status)) &&
        v.window.startMinute < visit.window.endMinute + buffer &&
        visit.window.startMinute - buffer < v.window.endMinute,
    );
    if (clash) {
      throw new ValidationException('The assignment violates the minimum buffer between visits');
    }
  }
}

/** Reschedule a scheduled visit to a new day and/or time window. */
@Injectable()
export class RescheduleVisitUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(SCHEDULING_SETTINGS_REPOSITORY) private readonly settings: SchedulingSettingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: {
    visitId: string;
    scheduledDate: Date;
    startMinute: number;
    endMinute: number;
  }): Promise<void> {
    const visit = await this.visits.findById(command.visitId);
    if (visit === null) {
      throw new NotFoundDomainException('Visit not found');
    }
    const now = this.clock.now();
    const { settings, holidays } = await loadSettings(this.settings, now);
    assertSchedulable(
      settings,
      holidays,
      command.scheduledDate,
      command.startMinute,
      command.endMinute,
      String(visit.priority),
    );
    visit.reschedule(
      command.scheduledDate,
      VisitWindow.create(command.startMinute, command.endMinute),
      now,
    );
    await this.visits.save(visit);
  }
}

export interface EditVisitCommand {
  visitId: string;
  scheduledDate: Date | null;
  startMinute: number | null;
  endMinute: number | null;
  visitType: VisitType | undefined;
  priority: VisitPriority | undefined;
  tasks: string[] | undefined;
  specialInstructions: string[] | undefined;
}

/**
 * Edit a scheduled visit's details from the Visit Details screen: its day and time,
 * service type, priority, task checklist and special instructions. The aggregate
 * only allows this before the visit starts.
 */
@Injectable()
export class EditVisitUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(SCHEDULING_SETTINGS_REPOSITORY) private readonly settings: SchedulingSettingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: EditVisitCommand): Promise<void> {
    const visit = await this.visits.findById(command.visitId);
    if (visit === null) {
      throw new NotFoundDomainException('Visit not found');
    }
    const now = this.clock.now();

    if (
      command.scheduledDate !== null ||
      command.startMinute !== null ||
      command.endMinute !== null
    ) {
      const date = command.scheduledDate ?? visit.scheduledDate;
      const start = command.startMinute ?? visit.window.startMinute;
      const end = command.endMinute ?? visit.window.endMinute;
      const { settings, holidays } = await loadSettings(this.settings, now);
      assertSchedulable(
        settings,
        holidays,
        date,
        start,
        end,
        String(command.priority ?? visit.priority),
      );
      visit.reschedule(date, VisitWindow.create(start, end), now);
    }

    visit.reviseDetails(
      {
        type: command.visitType,
        priority: command.priority,
        tasks:
          command.tasks === undefined
            ? undefined
            : command.tasks.map((label) => VisitTask.create(label)),
        specialInstructions: command.specialInstructions,
      },
      now,
    );

    await this.visits.save(visit);
  }
}

/** Cancel a scheduled visit. */
@Injectable()
export class CancelVisitUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: { visitId: string }): Promise<void> {
    const visit = await this.visits.findById(command.visitId);
    if (visit === null) {
      throw new NotFoundDomainException('Visit not found');
    }
    visit.cancel(this.clock.now());
    await this.visits.save(visit);
  }
}
