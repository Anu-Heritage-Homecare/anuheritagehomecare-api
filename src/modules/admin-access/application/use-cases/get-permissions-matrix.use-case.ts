import { Inject, Injectable } from '@nestjs/common';
import { ACCESS_ROLE_REPOSITORY, AccessRoleRepository } from '../../domain/access-role.repository';
import {
  PermissionsMatrixResult,
  toPermissionsMatrixResult,
} from '../dto/permissions-matrix.result';

/** Use case: the Permissions tab (the catalog plus each role's granted keys). */
@Injectable()
export class GetPermissionsMatrixUseCase {
  constructor(@Inject(ACCESS_ROLE_REPOSITORY) private readonly roles: AccessRoleRepository) {}

  async execute(): Promise<PermissionsMatrixResult> {
    const roles = await this.roles.list();
    return toPermissionsMatrixResult(roles);
  }
}
