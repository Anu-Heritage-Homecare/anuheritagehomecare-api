import { ApiProperty } from '@nestjs/swagger';
import { RecipientFamilyResult } from '../../application/dto/recipient-family.result';

class SummaryContactDto {
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty({ nullable: true }) relationship!: string | null;
}

class FamilySummaryDto {
  @ApiProperty({ type: SummaryContactDto }) primaryContact!: SummaryContactDto;
  @ApiProperty({ type: SummaryContactDto }) emergencyContact!: SummaryContactDto;
  @ApiProperty({ type: SummaryContactDto }) powerOfAttorney!: SummaryContactDto;
  @ApiProperty() totalMembers!: number;
}

class FamilyContactItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() relationship!: string;
  @ApiProperty({ nullable: true }) tier!: string | null;
  @ApiProperty({ type: [String] }) roles!: string[];
  @ApiProperty({ nullable: true }) roleNote!: string | null;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty({ nullable: true }) email!: string | null;
  @ApiProperty({ nullable: true }) address!: string | null;
  @ApiProperty() accessLevel!: string;
  @ApiProperty({ nullable: true }) accessScopeLabel!: string | null;
  @ApiProperty({ nullable: true }) preferredMethod!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) lastContactAt!: string | null;
  @ApiProperty({ nullable: true }) lastContactType!: string | null;
}

class CommunicationLogItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() familyMemberName!: string;
  @ApiProperty() type!: string;
  @ApiProperty() subject!: string;
  @ApiProperty() staffMemberName!: string;
  @ApiProperty({ type: String, format: 'date-time' }) occurredAt!: string;
}

class PermissionMatrixRowDto {
  @ApiProperty() familyMemberName!: string;
  @ApiProperty() accessLevel!: string;
  @ApiProperty({ nullable: true }) authorizedSectionsLabel!: string | null;
  @ApiProperty() portalLoginEnabled!: boolean;
}

export class RecipientFamilyResponseDto {
  @ApiProperty({ type: FamilySummaryDto }) summary!: FamilySummaryDto;
  @ApiProperty({ type: [FamilyContactItemDto] }) contacts!: FamilyContactItemDto[];
  @ApiProperty({ type: [CommunicationLogItemDto] }) communicationLog!: CommunicationLogItemDto[];
  @ApiProperty({ type: [PermissionMatrixRowDto] }) permissionsMatrix!: PermissionMatrixRowDto[];

  static fromResult(result: RecipientFamilyResult): RecipientFamilyResponseDto {
    const dto = new RecipientFamilyResponseDto();
    dto.summary = {
      primaryContact: { ...result.summary.primaryContact },
      emergencyContact: { ...result.summary.emergencyContact },
      powerOfAttorney: { ...result.summary.powerOfAttorney },
      totalMembers: result.summary.totalMembers,
    };
    dto.contacts = result.contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      relationship: contact.relationship,
      tier: contact.tier,
      roles: [...contact.roles],
      roleNote: contact.roleNote,
      phone: contact.phone,
      email: contact.email,
      address: contact.address,
      accessLevel: contact.accessLevel,
      accessScopeLabel: contact.accessScopeLabel,
      preferredMethod: contact.preferredMethod,
      lastContactAt: contact.lastContactAt === null ? null : contact.lastContactAt.toISOString(),
      lastContactType: contact.lastContactType,
    }));
    dto.communicationLog = result.communicationLog.map((row) => ({
      id: row.id,
      familyMemberName: row.familyMemberName,
      type: row.type,
      subject: row.subject,
      staffMemberName: row.staffMemberName,
      occurredAt: row.occurredAt.toISOString(),
    }));
    dto.permissionsMatrix = result.permissionsMatrix.map((row) => ({ ...row }));
    return dto;
  }
}
