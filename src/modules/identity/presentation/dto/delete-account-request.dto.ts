import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/** Request to close the authenticated user's account; re-authenticates with the password. */
export class DeleteAccountRequestDto {
  @ApiProperty({ description: 'The current password, to confirm this high risk action' })
  @IsString()
  @MinLength(1)
  password!: string;
}
