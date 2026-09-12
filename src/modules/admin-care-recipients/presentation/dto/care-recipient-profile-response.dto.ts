import { ApiProperty } from '@nestjs/swagger';
import { CareRecipientProfileResult } from '../../application/dto/care-recipient-profile.result';

const iso = (value: Date | null): string | null => (value === null ? null : value.toISOString());

/**
 * Response for the admin care recipient profile (Overview tab). A flat projection
 * of the aggregated result with dates rendered as ISO strings. Modelled loosely
 * with plain objects since the shape is display only.
 */
export class CareRecipientProfileResponseDto {
  @ApiProperty() header!: Record<string, unknown>;
  @ApiProperty() personalInformation!: Record<string, unknown>;
  @ApiProperty() careSummary!: Record<string, unknown>;
  @ApiProperty() quickStats!: Record<string, unknown>;
  @ApiProperty({ type: [Object] }) medications!: Record<string, unknown>[];
  @ApiProperty({ type: [Object] }) careTeam!: Record<string, unknown>[];
  @ApiProperty({ type: [Object] }) recentVisits!: Record<string, unknown>[];
  @ApiProperty({ type: [Object] }) upcomingVisits!: Record<string, unknown>[];
  @ApiProperty({ type: [Object] }) latestNotes!: Record<string, unknown>[];

  static fromResult(result: CareRecipientProfileResult): CareRecipientProfileResponseDto {
    const dto = new CareRecipientProfileResponseDto();
    dto.header = { ...result.header };
    dto.personalInformation = {
      ...result.personalInformation,
      dateOfBirth: iso(result.personalInformation.dateOfBirth),
    };
    dto.careSummary = {
      ...result.careSummary,
      startDate: iso(result.careSummary.startDate),
      nextScheduledVisitAt: iso(result.careSummary.nextScheduledVisitAt),
    };
    dto.quickStats = { ...result.quickStats };
    dto.medications = result.medications.map((m) => ({ ...m }));
    dto.careTeam = result.careTeam.map((c) => ({ ...c }));
    dto.recentVisits = result.recentVisits.map((v) => ({ ...v, date: iso(v.date) }));
    dto.upcomingVisits = result.upcomingVisits.map((v) => ({ ...v, date: iso(v.date) }));
    dto.latestNotes = result.latestNotes.map((n) => ({ ...n, at: iso(n.at) }));
    return dto;
  }
}
