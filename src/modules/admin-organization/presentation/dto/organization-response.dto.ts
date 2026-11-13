import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '@shared/domain/currency.enum';
import { BranchStatus } from '../../domain/branch-status.enum';
import { OrganizationResult } from '../../application/dto/organization.result';

class DayHoursResponseDto {
  @ApiProperty({ description: '0 = Sunday through 6 = Saturday' }) dayOfWeek!: number;
  @ApiProperty() isOpen!: boolean;
  @ApiProperty({ description: 'Minutes from midnight' }) openMinute!: number;
  @ApiProperty({ description: 'Minutes from midnight' }) closeMinute!: number;
}

class BranchResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() addressLine1!: string;
  @ApiProperty({ nullable: true }) addressLine2!: string | null;
  @ApiProperty() city!: string;
  @ApiProperty() state!: string;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty({ nullable: true }) managerId!: string | null;
  @ApiProperty({ nullable: true }) managerName!: string | null;
  @ApiProperty({ enum: BranchStatus }) status!: BranchStatus;
  @ApiProperty({ type: [DayHoursResponseDto] }) businessHours!: DayHoursResponseDto[];
}

class EmergencyContactResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) role!: string | null;
  @ApiProperty() phone!: string;
}

/** The whole Organization Profile settings screen. */
export class OrganizationResponseDto {
  @ApiProperty({ nullable: true }) legalName!: string | null;
  @ApiProperty({ nullable: true }) businessRegNumber!: string | null;
  @ApiProperty({ nullable: true }) registeredAddress!: string | null;
  @ApiProperty({ nullable: true }) timezone!: string | null;
  @ApiProperty({ nullable: true }) systemLanguage!: string | null;
  @ApiProperty({ enum: Currency }) currency!: Currency;
  @ApiProperty({ nullable: true }) dateFormat!: string | null;
  @ApiProperty({ type: [DayHoursResponseDto] }) businessHours!: DayHoursResponseDto[];
  @ApiProperty({ type: [BranchResponseDto] }) branches!: BranchResponseDto[];
  @ApiProperty({ type: [EmergencyContactResponseDto] })
  emergencyContacts!: EmergencyContactResponseDto[];

  static fromResult(result: OrganizationResult): OrganizationResponseDto {
    return Object.assign(new OrganizationResponseDto(), result);
  }
}
