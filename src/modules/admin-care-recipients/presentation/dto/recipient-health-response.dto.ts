import { ApiProperty } from '@nestjs/swagger';
import { RecipientHealthResult } from '../../application/dto/recipient-health.result';

class PrimaryConditionsDto {
  @ApiProperty({ nullable: true }) primary!: string | null;
  @ApiProperty({ type: [String] }) others!: string[];
}

class LastVitalsDto {
  @ApiProperty({ nullable: true }) systolic!: number | null;
  @ApiProperty({ nullable: true }) diastolic!: number | null;
  @ApiProperty({ nullable: true }) heartRate!: number | null;
  @ApiProperty({ nullable: true }) oxygenSaturation!: number | null;
  @ApiProperty({ nullable: true }) weightGrams!: number | null;
  @ApiProperty({ nullable: true }) temperatureCelsius!: number | null;
  @ApiProperty({ nullable: true }) bloodGlucose!: number | null;
  @ApiProperty({ type: String, format: 'date-time' }) recordedAt!: string;
}

class NextAppointmentDto {
  @ApiProperty({ nullable: true }) providerName!: string | null;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ type: String, format: 'date-time' }) at!: string;
}

class TrendSeriesDto {
  @ApiProperty({ nullable: true }) latest!: number | null;
  @ApiProperty({ type: [Number] }) series!: number[];
}

class BloodPressureTrendDto {
  @ApiProperty({ nullable: true }) latestSystolic!: number | null;
  @ApiProperty({ nullable: true }) latestDiastolic!: number | null;
  @ApiProperty({ type: [Number] }) systolicSeries!: number[];
}

class VitalsTrendDto {
  @ApiProperty({ type: BloodPressureTrendDto }) bloodPressure!: BloodPressureTrendDto;
  @ApiProperty({ type: TrendSeriesDto }) heartRate!: TrendSeriesDto;
  @ApiProperty({ type: TrendSeriesDto }) bloodGlucose!: TrendSeriesDto;
  @ApiProperty({ type: TrendSeriesDto }) weightGrams!: TrendSeriesDto;
  @ApiProperty({ type: TrendSeriesDto }) oxygen!: TrendSeriesDto;
}

class TimelineEventDto {
  @ApiProperty() id!: string;
  @ApiProperty() category!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ nullable: true }) recordedByName!: string | null;
  @ApiProperty({ nullable: true }) recordedByRole!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) occurredAt!: string;
}

class TimelineDto {
  @ApiProperty({ type: [TimelineEventDto] }) items!: TimelineEventDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class RecipientHealthResponseDto {
  @ApiProperty({ type: PrimaryConditionsDto }) primaryConditions!: PrimaryConditionsDto;
  @ApiProperty({ type: LastVitalsDto, nullable: true }) lastVitals!: LastVitalsDto | null;
  @ApiProperty({ type: NextAppointmentDto, nullable: true })
  nextAppointment!: NextAppointmentDto | null;
  @ApiProperty({ type: VitalsTrendDto }) vitalsTrend!: VitalsTrendDto;
  @ApiProperty({ type: TimelineDto }) timeline!: TimelineDto;

  static fromResult(result: RecipientHealthResult): RecipientHealthResponseDto {
    const dto = new RecipientHealthResponseDto();
    dto.primaryConditions = {
      ...result.primaryConditions,
      others: [...result.primaryConditions.others],
    };
    dto.lastVitals =
      result.lastVitals === null
        ? null
        : { ...result.lastVitals, recordedAt: result.lastVitals.recordedAt.toISOString() };
    dto.nextAppointment =
      result.nextAppointment === null
        ? null
        : { ...result.nextAppointment, at: result.nextAppointment.at.toISOString() };
    dto.vitalsTrend = {
      bloodPressure: {
        ...result.vitalsTrend.bloodPressure,
        systolicSeries: [...result.vitalsTrend.bloodPressure.systolicSeries],
      },
      heartRate: {
        ...result.vitalsTrend.heartRate,
        series: [...result.vitalsTrend.heartRate.series],
      },
      bloodGlucose: {
        ...result.vitalsTrend.bloodGlucose,
        series: [...result.vitalsTrend.bloodGlucose.series],
      },
      weightGrams: {
        ...result.vitalsTrend.weightGrams,
        series: [...result.vitalsTrend.weightGrams.series],
      },
      oxygen: { ...result.vitalsTrend.oxygen, series: [...result.vitalsTrend.oxygen.series] },
    };
    dto.timeline = {
      items: result.timeline.items.map((item) => ({
        id: item.id,
        category: item.category,
        title: item.title,
        description: item.description,
        recordedByName: item.recordedByName,
        recordedByRole: item.recordedByRole,
        occurredAt: item.occurredAt.toISOString(),
      })),
      page: result.timeline.page,
      pageSize: result.timeline.pageSize,
      total: result.timeline.total,
      totalPages: result.timeline.totalPages,
    };
    return dto;
  }
}
