import { ApiProperty } from '@nestjs/swagger';
import { RecipientMedicationsResult } from '../../application/dto/recipient-medications.result';

class NextDoseDto {
  @ApiProperty({ type: String, format: 'date-time' }) at!: string;
  @ApiProperty() minute!: number;
  @ApiProperty() label!: string;
}

class MedicationsSummaryDto {
  @ApiProperty() activeMedications!: number;
  @ApiProperty({ nullable: true }) adherenceRatePercent!: number | null;
  @ApiProperty({ nullable: true }) adherenceTrendPoints!: number | null;
  @ApiProperty({ type: NextDoseDto, nullable: true }) nextDose!: NextDoseDto | null;
  @ApiProperty() activeAlerts!: number;
  @ApiProperty({ nullable: true }) alertSummary!: string | null;
}

class LastAdministeredDto {
  @ApiProperty({ type: String, format: 'date-time' }) at!: string;
  @ApiProperty({ nullable: true }) caregiverName!: string | null;
}

class PrescriptionDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) dose!: string | null;
  @ApiProperty({ nullable: true }) purpose!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() scheduleLabel!: string;
  @ApiProperty({ nullable: true }) prescribedBy!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date' }) startDate!: string | null;
  @ApiProperty({ nullable: true }) adherencePercent!: number | null;
  @ApiProperty({ type: LastAdministeredDto, nullable: true })
  lastAdministered!: LastAdministeredDto | null;
  @ApiProperty({ nullable: true }) alert!: string | null;
}

class ScheduleDoseMedicationDto {
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) dose!: string | null;
}

class ScheduleDoseDto {
  @ApiProperty() minute!: number;
  @ApiProperty() timeLabel!: string;
  @ApiProperty() periodLabel!: string;
  @ApiProperty({ type: [ScheduleDoseMedicationDto] }) medications!: ScheduleDoseMedicationDto[];
  @ApiProperty() administered!: boolean;
  @ApiProperty({ nullable: true }) caregiverName!: string | null;
}

class MedicationWarningDto {
  @ApiProperty() title!: string;
  @ApiProperty() detail!: string;
}

class MedicationAuditDto {
  @ApiProperty({ type: String, format: 'date-time' }) at!: string;
  @ApiProperty() title!: string;
  @ApiProperty() detail!: string;
  @ApiProperty({ nullable: true }) authorName!: string | null;
}

export class RecipientMedicationsResponseDto {
  @ApiProperty({ type: MedicationsSummaryDto }) summary!: MedicationsSummaryDto;
  @ApiProperty({ type: [PrescriptionDto] }) prescriptions!: PrescriptionDto[];
  @ApiProperty({ type: [ScheduleDoseDto] }) todaysSchedule!: ScheduleDoseDto[];
  @ApiProperty({ type: [MedicationWarningDto] }) warnings!: MedicationWarningDto[];
  @ApiProperty({ type: [MedicationAuditDto] }) audits!: MedicationAuditDto[];

  static fromResult(result: RecipientMedicationsResult): RecipientMedicationsResponseDto {
    const dto = new RecipientMedicationsResponseDto();
    dto.summary = {
      activeMedications: result.summary.activeMedications,
      adherenceRatePercent: result.summary.adherenceRatePercent,
      adherenceTrendPoints: result.summary.adherenceTrendPoints,
      nextDose:
        result.summary.nextDose === null
          ? null
          : {
              at: result.summary.nextDose.at.toISOString(),
              minute: result.summary.nextDose.minute,
              label: result.summary.nextDose.label,
            },
      activeAlerts: result.summary.activeAlerts,
      alertSummary: result.summary.alertSummary,
    };
    dto.prescriptions = result.prescriptions.map((p) => ({
      id: p.id,
      name: p.name,
      dose: p.dose,
      purpose: p.purpose,
      status: p.status,
      scheduleLabel: p.scheduleLabel,
      prescribedBy: p.prescribedBy,
      startDate: p.startDate === null ? null : p.startDate.toISOString().slice(0, 10),
      adherencePercent: p.adherencePercent,
      lastAdministered:
        p.lastAdministered === null
          ? null
          : {
              at: p.lastAdministered.at.toISOString(),
              caregiverName: p.lastAdministered.caregiverName,
            },
      alert: p.alert,
    }));
    dto.todaysSchedule = result.todaysSchedule.map((d) => ({
      minute: d.minute,
      timeLabel: d.timeLabel,
      periodLabel: d.periodLabel,
      medications: d.medications.map((m) => ({ ...m })),
      administered: d.administered,
      caregiverName: d.caregiverName,
    }));
    dto.warnings = result.warnings.map((w) => ({ ...w }));
    dto.audits = result.audits.map((a) => ({
      at: a.at.toISOString(),
      title: a.title,
      detail: a.detail,
      authorName: a.authorName,
    }));
    return dto;
  }
}
