import { ApiProperty } from '@nestjs/swagger';
import { UserProfileResult } from '../../application/dto/user-profile.result';
import { UserStatus } from '../../domain/user-status.enum';
import { UserType } from '../../domain/user-type.enum';

/** HTTP response contract for a user profile. Never carries secrets. */
export class UserProfileResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: UserType, enumName: 'UserType' })
  userType!: UserType;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty()
  phoneVerified!: boolean;

  @ApiProperty()
  isFamilyOwner!: boolean;

  @ApiProperty({ enum: UserStatus, enumName: 'UserStatus' })
  status!: UserStatus;

  static fromResult(result: UserProfileResult): UserProfileResponseDto {
    const dto = new UserProfileResponseDto();
    dto.id = result.id;
    dto.userType = result.userType;
    dto.firstName = result.firstName;
    dto.lastName = result.lastName;
    dto.email = result.email;
    dto.phone = result.phone;
    dto.emailVerified = result.emailVerified;
    dto.phoneVerified = result.phoneVerified;
    dto.isFamilyOwner = result.isFamilyOwner;
    dto.status = result.status;
    return dto;
  }
}
