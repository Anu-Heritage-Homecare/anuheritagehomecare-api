import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
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

export interface ScheduleVisitCommand {
  careRecipientId: string;
  caregiverId: string | null;
  scheduledDate: Date;
  startMinute: number;
  endMinute: number;
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

    const window = VisitWindow.create(command.startMinute, command.endMinute);
    const tasks = command.tasks.map((label) => VisitTask.create(label));
    const now = this.clock.now();
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
    visit.assignCaregiver(command.caregiverId, now);
    await this.visits.save(visit);
    return { assignedAt: now };
  }
}

/** Reschedule a scheduled visit to a new day and/or time window. */
@Injectable()
export class RescheduleVisitUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
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
    visit.reschedule(
      command.scheduledDate,
      VisitWindow.create(command.startMinute, command.endMinute),
      this.clock.now(),
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
