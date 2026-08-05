import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CLIENT_REPOSITORY, ClientRepository } from '../../domain/client.repository';
import { ClientResult, toClientResult } from '../dto/client-result';

/**
 * Use case: fetch a single client by identity. Kept as its own class so read
 * and write concerns stay small and independently testable.
 */
@Injectable()
export class GetClientByIdUseCase {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository) {}

  async execute(id: string): Promise<ClientResult> {
    const client = await this.clients.findById(id);
    if (client === null) {
      throw new NotFoundDomainException(`Client ${id} was not found`);
    }
    return toClientResult(client);
  }
}
