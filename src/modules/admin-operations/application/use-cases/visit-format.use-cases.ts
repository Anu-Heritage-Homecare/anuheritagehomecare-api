import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { FormatRate, VisitFormat } from '../../domain/visit-format.entity';
import { RateUnit } from '../../domain/rate-unit.enum';
import {
  VISIT_FORMAT_REPOSITORY,
  VisitFormatRepository,
} from '../../domain/visit-format.repository';
import { CareOperationsResult } from '../dto/care-operations.result';
import { GetCareOperationsUseCase } from './get-care-operations.use-case';

export interface AddVisitFormatCommand {
  name: string;
  description?: string | null;
  durationMinutes?: number | null;
  rateUnit?: RateUnit;
  sortOrder?: number;
  isActive?: boolean;
  rates?: FormatRate[];
}

/** Use case: add a visit format with its per currency rates (the Add Format action). */
@Injectable()
export class AddVisitFormatUseCase {
  constructor(
    @Inject(VISIT_FORMAT_REPOSITORY) private readonly formats: VisitFormatRepository,
    private readonly screen: GetCareOperationsUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: AddVisitFormatCommand): Promise<CareOperationsResult> {
    const format = VisitFormat.create({
      id: this.ids.generate(),
      name: command.name,
      description: command.description,
      durationMinutes: command.durationMinutes,
      rateUnit: command.rateUnit,
      sortOrder: command.sortOrder,
      isActive: command.isActive,
      rates: command.rates,
      now: this.clock.now(),
    });
    await this.formats.save(format);
    return this.screen.execute();
  }
}

export interface UpdateVisitFormatCommand {
  formatId: string;
  name?: string;
  description?: string | null;
  durationMinutes?: number | null;
  rateUnit?: RateUnit;
  sortOrder?: number;
  isActive?: boolean;
  rates?: FormatRate[];
}

/** Use case: edit a visit format and/or its rates. */
@Injectable()
export class UpdateVisitFormatUseCase {
  constructor(
    @Inject(VISIT_FORMAT_REPOSITORY) private readonly formats: VisitFormatRepository,
    private readonly screen: GetCareOperationsUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateVisitFormatCommand): Promise<CareOperationsResult> {
    const format = await this.formats.findById(command.formatId);
    if (format === null) {
      throw new NotFoundDomainException('Visit format not found');
    }
    const { formatId: _formatId, ...fields } = command;
    format.edit(fields, this.clock.now());
    await this.formats.save(format);
    return this.screen.execute();
  }
}

/** Use case: remove a visit format. */
@Injectable()
export class DeleteVisitFormatUseCase {
  constructor(
    @Inject(VISIT_FORMAT_REPOSITORY) private readonly formats: VisitFormatRepository,
    private readonly screen: GetCareOperationsUseCase,
  ) {}

  async execute(formatId: string): Promise<CareOperationsResult> {
    const format = await this.formats.findById(formatId);
    if (format === null) {
      throw new NotFoundDomainException('Visit format not found');
    }
    await this.formats.delete(formatId);
    return this.screen.execute();
  }
}
