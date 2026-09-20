import { ApiProperty } from '@nestjs/swagger';
import {
  FamilyDetailResult,
  FamilyKpisResult,
  FamilyListResult,
  FamilyRowResult,
} from '../../application/dto/family-directory.result';

class FamilyRowDto implements FamilyRowResult {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) relationship!: string | null;
  @ApiProperty() hasAccount!: boolean;
  @ApiProperty({ nullable: true, type: String }) phone!: string | null;
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty({ type: [String] }) linkedRecipientNames!: string[];
  @ApiProperty() billingStatus!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true, type: Number }) unreadMessages!: number | null;
  @ApiProperty() lastActivity!: string;
}

/** The Families directory table response. */
export class FamilyListResponseDto implements FamilyListResult {
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ type: [FamilyRowDto] }) rows!: FamilyRowDto[];

  static fromResult(result: FamilyListResult): FamilyListResponseDto {
    return result;
  }
}

/** The Families KPI bar response. */
export class FamilyKpisResponseDto implements FamilyKpisResult {
  @ApiProperty() totalFamilies!: number;
  @ApiProperty() newFamilies!: number;
  @ApiProperty() primaryContacts!: number;
  @ApiProperty() withActiveCare!: number;
  @ApiProperty() outstandingPayments!: number;
  @ApiProperty() pendingRequests!: number;
  @ApiProperty({ nullable: true, type: Number }) unreadMessages!: number | null;

  static fromResult(result: FamilyKpisResult): FamilyKpisResponseDto {
    return result;
  }
}

/** The Quick Preview drawer detail response. */
export class FamilyDetailResponseDto implements FamilyDetailResult {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) relationship!: string | null;
  @ApiProperty() hasAccount!: boolean;
  @ApiProperty({ nullable: true, type: String }) phone!: string | null;
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty({ nullable: true, type: String }) primaryRecipientName!: string | null;
  @ApiProperty({ type: [String] }) linkedRecipientNames!: string[];
  @ApiProperty() emergencyContactVerified!: boolean;
  @ApiProperty() outstandingBalanceMinor!: number;
  @ApiProperty({ nullable: true, type: String }) currency!: string | null;
  @ApiProperty() billingStatus!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true, type: String }) quickNotes!: string | null;
  @ApiProperty() lastActivity!: string;
  @ApiProperty({ nullable: true, type: Number }) unreadMessages!: number | null;

  static fromResult(result: FamilyDetailResult): FamilyDetailResponseDto {
    return result;
  }
}
