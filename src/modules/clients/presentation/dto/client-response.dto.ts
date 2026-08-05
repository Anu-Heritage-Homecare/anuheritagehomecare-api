import { ApiProperty } from '@nestjs/swagger';
import { ClientStatus } from '../../domain/client-status.enum';
import { ClientResult } from '../../application/dto/client-result';

/** HTTP response contract for a client resource. */
export class ClientResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty({ enum: ClientStatus, enumName: 'ClientStatus' })
  status!: ClientStatus;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  static fromResult(result: ClientResult): ClientResponseDto {
    const dto = new ClientResponseDto();
    dto.id = result.id;
    dto.firstName = result.firstName;
    dto.lastName = result.lastName;
    dto.email = result.email;
    dto.phone = result.phone;
    dto.status = result.status;
    dto.createdAt = result.createdAt;
    dto.updatedAt = result.updatedAt;
    return dto;
  }
}
