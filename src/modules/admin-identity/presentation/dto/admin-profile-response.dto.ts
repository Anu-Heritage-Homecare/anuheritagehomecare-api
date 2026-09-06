import { ApiProperty } from '@nestjs/swagger';
import { AdminRole } from '../../domain/admin-role.enum';
import { AdminProfileResult } from '../../application/dto/admin-profile.result';

export class AdminProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: AdminRole })
  role!: AdminRole;

  @ApiProperty({ nullable: true })
  photoKey!: string | null;

  @ApiProperty({ description: 'Whether the client must force a password change on first login' })
  mustChangePassword!: boolean;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  lastLoginAt!: string | null;

  static fromResult(result: AdminProfileResult): AdminProfileResponseDto {
    const dto = new AdminProfileResponseDto();
    dto.id = result.id;
    dto.firstName = result.firstName;
    dto.lastName = result.lastName;
    dto.fullName = result.fullName;
    dto.email = result.email;
    dto.role = result.role;
    dto.photoKey = result.photoKey;
    dto.mustChangePassword = result.mustChangePassword;
    dto.lastLoginAt = result.lastLoginAt === null ? null : result.lastLoginAt.toISOString();
    return dto;
  }
}
