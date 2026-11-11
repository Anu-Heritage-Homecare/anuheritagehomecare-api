import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { ServiceOffering } from '../../domain/service-offering.entity';
import {
  SERVICE_OFFERING_REPOSITORY,
  ServiceOfferingRepository,
} from '../../domain/service-offering.repository';
import { CareOperationsResult } from '../dto/care-operations.result';
import { GetCareOperationsUseCase } from './get-care-operations.use-case';

export interface AddServiceOfferingCommand {
  name: string;
  description?: string | null;
  isEnabled?: boolean;
  sortOrder?: number;
}

/** Use case: add a service offering (the Add Service action). */
@Injectable()
export class AddServiceOfferingUseCase {
  constructor(
    @Inject(SERVICE_OFFERING_REPOSITORY) private readonly services: ServiceOfferingRepository,
    private readonly screen: GetCareOperationsUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: AddServiceOfferingCommand): Promise<CareOperationsResult> {
    const offering = ServiceOffering.create({
      id: this.ids.generate(),
      name: command.name,
      description: command.description,
      isEnabled: command.isEnabled,
      sortOrder: command.sortOrder,
      now: this.clock.now(),
    });
    await this.services.save(offering);
    return this.screen.execute();
  }
}

export interface UpdateServiceOfferingCommand {
  offeringId: string;
  name?: string;
  description?: string | null;
  isEnabled?: boolean;
  sortOrder?: number;
}

/** Use case: edit a service offering, including the enable/disable toggle. */
@Injectable()
export class UpdateServiceOfferingUseCase {
  constructor(
    @Inject(SERVICE_OFFERING_REPOSITORY) private readonly services: ServiceOfferingRepository,
    private readonly screen: GetCareOperationsUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateServiceOfferingCommand): Promise<CareOperationsResult> {
    const offering = await this.services.findById(command.offeringId);
    if (offering === null) {
      throw new NotFoundDomainException('Service offering not found');
    }
    const { offeringId: _offeringId, ...fields } = command;
    offering.edit(fields, this.clock.now());
    await this.services.save(offering);
    return this.screen.execute();
  }
}

/** Use case: remove a service offering. */
@Injectable()
export class DeleteServiceOfferingUseCase {
  constructor(
    @Inject(SERVICE_OFFERING_REPOSITORY) private readonly services: ServiceOfferingRepository,
    private readonly screen: GetCareOperationsUseCase,
  ) {}

  async execute(offeringId: string): Promise<CareOperationsResult> {
    const offering = await this.services.findById(offeringId);
    if (offering === null) {
      throw new NotFoundDomainException('Service offering not found');
    }
    await this.services.delete(offeringId);
    return this.screen.execute();
  }
}
