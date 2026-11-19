import { ApiProperty } from '@nestjs/swagger';
import {
  KycAuditListResult,
  KycClaimedResult,
  KycMismatchResult,
  KycOwnerResult,
  KycVerificationRowResult,
} from '../../application/dto/kyc-audit-list.result';

class KycOwnerDto implements KycOwnerResult {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true, type: String }) name!: string | null;
}

class KycClaimedDto implements KycClaimedResult {
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() dateOfBirth!: string;
}

class KycMismatchDto implements KycMismatchResult {
  @ApiProperty() field!: string;
  @ApiProperty() provided!: string;
  @ApiProperty() returned!: string;
}

class KycVerificationRowDto implements KycVerificationRowResult {
  @ApiProperty() id!: string;
  @ApiProperty({ type: KycOwnerDto }) owner!: KycOwnerDto;
  @ApiProperty() country!: string;
  @ApiProperty() provider!: string;
  @ApiProperty({ nullable: true, type: String }) documentType!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true, type: String }) faceMatch!: string | null;
  @ApiProperty({ nullable: true, type: String }) maskedReference!: string | null;
  @ApiProperty({ type: KycClaimedDto }) claimed!: KycClaimedDto;
  @ApiProperty({ type: [KycMismatchDto] }) mismatches!: KycMismatchDto[];
  @ApiProperty() submittedAt!: string;
  @ApiProperty({ nullable: true, type: String }) verifiedAt!: string | null;
}

/** The KYC mismatch audit table response. */
export class KycAuditListResponseDto implements KycAuditListResult {
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ type: [KycVerificationRowDto] }) rows!: KycVerificationRowDto[];

  static fromResult(result: KycAuditListResult): KycAuditListResponseDto {
    return result;
  }
}
