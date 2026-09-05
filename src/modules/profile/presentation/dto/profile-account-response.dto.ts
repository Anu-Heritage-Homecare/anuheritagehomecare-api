import { ApiProperty } from '@nestjs/swagger';
import { ProfileAccountResult } from '../../application/use-cases/get-profile-account.use-case';

/** HTTP response for the profile account card. */
export class ProfileAccountResponseDto {
  @ApiProperty({ example: 'Andy Pratama' })
  name!: string;

  @ApiProperty({ example: 'Primary Family Member' })
  role!: string;

  @ApiProperty({ nullable: true, example: 'Premium Home Care' })
  planName!: string | null;

  @ApiProperty({ nullable: true, description: 'Signed avatar URL, or null when none is set' })
  photoUrl!: string | null;

  static fromResult(result: ProfileAccountResult): ProfileAccountResponseDto {
    return Object.assign(new ProfileAccountResponseDto(), result);
  }
}
