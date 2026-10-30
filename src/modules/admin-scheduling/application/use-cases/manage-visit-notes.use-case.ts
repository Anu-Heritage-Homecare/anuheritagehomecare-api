import { Inject, Injectable } from '@nestjs/common';
import { AdminRole } from '@modules/admin-identity/domain/admin-role.enum';
import {
  ADMIN_USER_REPOSITORY,
  AdminUserRepository,
} from '@modules/admin-identity/domain/admin-user.repository';
import { Visit } from '@modules/visits/domain/visit.entity';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { VisitNoteReply } from '@modules/visits/domain/value-objects/visit-note-reply.vo';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  [AdminRole.SuperAdmin]: 'Administrator',
  [AdminRole.OperationsManager]: 'Operations Manager',
  [AdminRole.Coordinator]: 'Coordinator',
};

/**
 * The coordinator note operations on a visit's notes feed, from the admin Visit
 * Details Notes tab: add a coordinator note, acknowledge, flag for attention, edit a
 * coordinator note and reply. Not bound to the shift, so they work in any status.
 * The author name and role are snapshotted from the acting admin.
 */
abstract class VisitNoteWriteBase {
  constructor(
    protected readonly visits: VisitRepository,
    protected readonly admins: AdminUserRepository,
    protected readonly ids: IdGenerator,
    protected readonly clock: Clock,
  ) {}

  protected async loadVisit(visitId: string): Promise<Visit> {
    const visit = await this.visits.findById(visitId);
    if (visit === null) {
      throw new NotFoundDomainException('Visit not found');
    }
    return visit;
  }

  protected async author(adminId: string): Promise<{ name: string; role: string }> {
    const admin = await this.admins.findById(adminId);
    if (admin === null) {
      throw new NotFoundDomainException('Admin not found');
    }
    return {
      name: `${admin.name.firstName} ${admin.name.lastName}`.trim(),
      role: ADMIN_ROLE_LABELS[admin.role],
    };
  }
}

@Injectable()
export class AddCoordinatorNoteUseCase extends VisitNoteWriteBase {
  constructor(
    @Inject(VISIT_REPOSITORY) visits: VisitRepository,
    @Inject(ADMIN_USER_REPOSITORY) admins: AdminUserRepository,
    @Inject(ID_GENERATOR) ids: IdGenerator,
    @Inject(CLOCK) clock: Clock,
  ) {
    super(visits, admins, ids, clock);
  }

  async execute(command: {
    visitId: string;
    adminId: string;
    text: string;
  }): Promise<{ id: string }> {
    const visit = await this.loadVisit(command.visitId);
    const author = await this.author(command.adminId);
    const id = this.ids.generate();
    visit.addCoordinatorNote({
      id,
      authorAdminId: command.adminId,
      authorName: author.name,
      authorRole: author.role,
      text: command.text,
      now: this.clock.now(),
    });
    await this.visits.save(visit);
    return { id };
  }
}

@Injectable()
export class AcknowledgeVisitNoteUseCase extends VisitNoteWriteBase {
  constructor(
    @Inject(VISIT_REPOSITORY) visits: VisitRepository,
    @Inject(ADMIN_USER_REPOSITORY) admins: AdminUserRepository,
    @Inject(ID_GENERATOR) ids: IdGenerator,
    @Inject(CLOCK) clock: Clock,
  ) {
    super(visits, admins, ids, clock);
  }

  async execute(command: { visitId: string; noteId: string; adminId: string }): Promise<void> {
    const visit = await this.loadVisit(command.visitId);
    const author = await this.author(command.adminId);
    visit.acknowledgeNote(command.noteId, author.name, this.clock.now());
    await this.visits.save(visit);
  }
}

@Injectable()
export class FlagVisitNoteUseCase extends VisitNoteWriteBase {
  constructor(
    @Inject(VISIT_REPOSITORY) visits: VisitRepository,
    @Inject(ADMIN_USER_REPOSITORY) admins: AdminUserRepository,
    @Inject(ID_GENERATOR) ids: IdGenerator,
    @Inject(CLOCK) clock: Clock,
  ) {
    super(visits, admins, ids, clock);
  }

  async execute(command: { visitId: string; noteId: string }): Promise<void> {
    const visit = await this.loadVisit(command.visitId);
    visit.flagNote(command.noteId, this.clock.now());
    await this.visits.save(visit);
  }
}

@Injectable()
export class EditVisitNoteUseCase extends VisitNoteWriteBase {
  constructor(
    @Inject(VISIT_REPOSITORY) visits: VisitRepository,
    @Inject(ADMIN_USER_REPOSITORY) admins: AdminUserRepository,
    @Inject(ID_GENERATOR) ids: IdGenerator,
    @Inject(CLOCK) clock: Clock,
  ) {
    super(visits, admins, ids, clock);
  }

  async execute(command: { visitId: string; noteId: string; text: string }): Promise<void> {
    const visit = await this.loadVisit(command.visitId);
    visit.editNote(command.noteId, command.text, this.clock.now());
    await this.visits.save(visit);
  }
}

@Injectable()
export class ReplyToVisitNoteUseCase extends VisitNoteWriteBase {
  constructor(
    @Inject(VISIT_REPOSITORY) visits: VisitRepository,
    @Inject(ADMIN_USER_REPOSITORY) admins: AdminUserRepository,
    @Inject(ID_GENERATOR) ids: IdGenerator,
    @Inject(CLOCK) clock: Clock,
  ) {
    super(visits, admins, ids, clock);
  }

  async execute(command: {
    visitId: string;
    noteId: string;
    adminId: string;
    text: string;
  }): Promise<{ id: string }> {
    const visit = await this.loadVisit(command.visitId);
    const author = await this.author(command.adminId);
    const now = this.clock.now();
    const reply = VisitNoteReply.create({
      id: this.ids.generate(),
      authorName: author.name,
      authorRole: author.role,
      text: command.text,
      createdAt: now,
    });
    visit.replyToNote(command.noteId, reply, now);
    await this.visits.save(visit);
    return { id: reply.id };
  }
}
