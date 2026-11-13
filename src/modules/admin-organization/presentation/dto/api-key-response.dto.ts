import { ApiProperty } from '@nestjs/swagger';
import { ApiKeyCreatedResult, ApiKeyResult } from '../../application/dto/api-key.result';
import { ApiKeyStatus } from '../../domain/api-key-status.enum';

class ApiKeyUsageResponseDto {
  @ApiProperty() today!: number;
  @ApiProperty() thisWeek!: number;
}

/** One API key as the details drawer and the list render it. Never the secret. */
export class ApiKeyResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ApiKeyStatus }) status!: ApiKeyStatus;
  @ApiProperty() keyPrefix!: string;
  @ApiProperty() last4!: string;
  @ApiProperty({ example: 'sk-cp-****3f7a' }) maskedValue!: string;
  @ApiProperty({ type: [String] }) scopes!: string[];
  @ApiProperty() rateLimitPerHour!: number;
  @ApiProperty({ nullable: true }) createdById!: string | null;
  @ApiProperty({ nullable: true }) createdByName!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ nullable: true }) lastUsedAt!: Date | null;
  @ApiProperty({ type: ApiKeyUsageResponseDto }) usage!: ApiKeyUsageResponseDto;

  static fromResult(result: ApiKeyResult): ApiKeyResponseDto {
    return Object.assign(new ApiKeyResponseDto(), result);
  }
}

/** A created or regenerated key, carrying the raw secret shown exactly once. */
export class ApiKeyCreatedResponseDto {
  @ApiProperty({ type: ApiKeyResponseDto }) key!: ApiKeyResponseDto;
  @ApiProperty({
    description: 'The full secret, shown only once. Store it now; it cannot be retrieved again.',
  })
  secret!: string;

  static fromResult(result: ApiKeyCreatedResult): ApiKeyCreatedResponseDto {
    const dto = new ApiKeyCreatedResponseDto();
    dto.key = ApiKeyResponseDto.fromResult(result.key);
    dto.secret = result.secret;
    return dto;
  }
}
