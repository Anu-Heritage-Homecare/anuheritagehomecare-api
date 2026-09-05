import { ApiProperty } from '@nestjs/swagger';
import { UserAddressResult, UserProfileResult } from '../../application/dto/user-profile.result';
import { Country } from '../../domain/country.enum';
import { UserStatus } from '../../domain/user-status.enum';
import { UserType } from '../../domain/user-type.enum';

/** The postal address of a user in an HTTP response. */
export class UserAddressResponseDto {
  @ApiProperty()
  line1!: string;

  @ApiProperty({ nullable: true })
  line2!: string | null;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  state!: string;

  @ApiProperty()
  postalCode!: string;

  @ApiProperty({ enum: Country, enumName: 'Country' })
  country!: Country;

  static fromResult(result: UserAddressResult): UserAddressResponseDto {
    const dto = new UserAddressResponseDto();
    dto.line1 = result.line1;
    dto.line2 = result.line2;
    dto.city = result.city;
    dto.state = result.state;
    dto.postalCode = result.postalCode;
    dto.country = result.country;
    return dto;
  }
}

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

  @ApiProperty({ type: UserAddressResponseDto })
  address!: UserAddressResponseDto;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty()
  phoneVerified!: boolean;

  @ApiProperty()
  isFamilyOwner!: boolean;

  @ApiProperty({
    description: 'When true the client must force a password change before normal use',
  })
  mustChangePassword!: boolean;

  @ApiProperty({ enum: UserStatus, enumName: 'UserStatus' })
  status!: UserStatus;

  @ApiProperty({ nullable: true, example: '1990-03-15' })
  dateOfBirth!: string | null;

  @ApiProperty({ nullable: true, example: 'Son' })
  relationshipToRecipient!: string | null;

  @ApiProperty({ nullable: true, description: 'Signed avatar URL, or null when none is set' })
  photoUrl!: string | null;

  static fromResult(result: UserProfileResult): UserProfileResponseDto {
    const dto = new UserProfileResponseDto();
    dto.id = result.id;
    dto.userType = result.userType;
    dto.firstName = result.firstName;
    dto.lastName = result.lastName;
    dto.email = result.email;
    dto.phone = result.phone;
    dto.address = UserAddressResponseDto.fromResult(result.address);
    dto.emailVerified = result.emailVerified;
    dto.phoneVerified = result.phoneVerified;
    dto.isFamilyOwner = result.isFamilyOwner;
    dto.mustChangePassword = result.mustChangePassword;
    dto.status = result.status;
    dto.dateOfBirth = result.dateOfBirth;
    dto.relationshipToRecipient = result.relationshipToRecipient;
    dto.photoUrl = result.photoUrl;
    return dto;
  }
}
