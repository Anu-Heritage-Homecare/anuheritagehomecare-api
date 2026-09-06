import { Inject, Injectable } from '@nestjs/common';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { ADMIN_USER_REPOSITORY, AdminUserRepository } from '../../domain/admin-user.repository';
import { AdminProfileResult, toAdminProfile } from '../dto/admin-profile.result';

/** Use case: return the authenticated admin's own account information. */
@Injectable()
export class GetAdminProfileUseCase {
  constructor(@Inject(ADMIN_USER_REPOSITORY) private readonly admins: AdminUserRepository) {}

  async execute(adminUserId: string): Promise<AdminProfileResult> {
    const admin = await this.admins.findById(adminUserId);
    if (admin === null) {
      throw new NotFoundDomainException('Admin account not found');
    }
    return toAdminProfile(admin);
  }
}
