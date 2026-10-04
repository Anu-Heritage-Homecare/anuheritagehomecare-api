import { Injectable } from '@nestjs/common';
import { HolidayPolicy as PrismaHolidayPolicy, Prisma } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { HolidayPolicy } from '../../domain/holiday-policy.enum';
import {
  BusinessHourDay,
  SchedulingRules,
  SchedulingSettings,
  TravelSettings,
} from '../../domain/scheduling-settings.entity';
import {
  SchedulingHolidayData,
  SchedulingSettingsRepository,
} from '../../domain/scheduling-settings.repository';

const TO_DOMAIN_POLICY: Record<PrismaHolidayPolicy, HolidayPolicy> = {
  CLOSED: HolidayPolicy.Closed,
  EMERGENCY_ONLY: HolidayPolicy.EmergencyOnly,
  OPEN: HolidayPolicy.Open,
};

const TO_PERSISTENCE_POLICY: Record<HolidayPolicy, PrismaHolidayPolicy> = {
  [HolidayPolicy.Closed]: 'CLOSED',
  [HolidayPolicy.EmergencyOnly]: 'EMERGENCY_ONLY',
  [HolidayPolicy.Open]: 'OPEN',
};

/** Prisma backed adapter for the SchedulingSettingsRepository port. */
@Injectable()
export class SchedulingSettingsPrismaRepository implements SchedulingSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(): Promise<SchedulingSettings | null> {
    const row = await this.prisma.schedulingSettings.findUnique({
      where: { id: SchedulingSettings.SINGLETON_ID },
    });
    if (row === null) {
      return null;
    }
    return SchedulingSettings.rehydrate(row.id, {
      businessHours: row.businessHours as unknown as BusinessHourDay[],
      defaultDurations: row.defaultDurations as unknown as Record<string, number>,
      rules: {
        requireCertificationMatch: row.requireCertificationMatch,
        autoAssignPreferredCaregiver: row.autoAssignPreferredCaregiver,
        allowOvertimeScheduling: row.allowOvertimeScheduling,
        requireCoordinatorApprovalForUrgent: row.requireCoordinatorApprovalForUrgent,
        sendRemindersOneHourBefore: row.sendRemindersOneHourBefore,
        autoCancelUnconfirmedAfter24h: row.autoCancelUnconfirmedAfter24h,
      },
      travel: {
        minBufferMinutes: row.minBufferMinutes,
        travelTimeEstimation: row.travelTimeEstimation,
        maxTravelDistanceMiles: row.maxTravelDistanceMiles,
        allowBackToBackVisits: row.allowBackToBackVisits,
      },
      updatedAt: row.updatedAt,
    });
  }

  async save(settings: SchedulingSettings): Promise<void> {
    const rules: SchedulingRules = settings.rules;
    const travel: TravelSettings = settings.travel;
    const data = {
      businessHours: settings.businessHours as unknown as Prisma.InputJsonValue,
      defaultDurations: settings.defaultDurations as unknown as Prisma.InputJsonValue,
      requireCertificationMatch: rules.requireCertificationMatch,
      autoAssignPreferredCaregiver: rules.autoAssignPreferredCaregiver,
      allowOvertimeScheduling: rules.allowOvertimeScheduling,
      requireCoordinatorApprovalForUrgent: rules.requireCoordinatorApprovalForUrgent,
      sendRemindersOneHourBefore: rules.sendRemindersOneHourBefore,
      autoCancelUnconfirmedAfter24h: rules.autoCancelUnconfirmedAfter24h,
      minBufferMinutes: travel.minBufferMinutes,
      travelTimeEstimation: travel.travelTimeEstimation,
      maxTravelDistanceMiles: travel.maxTravelDistanceMiles,
      allowBackToBackVisits: travel.allowBackToBackVisits,
    };
    await this.prisma.schedulingSettings.upsert({
      where: { id: settings.id },
      create: { id: settings.id, ...data },
      update: data,
    });
  }

  async listHolidays(): Promise<SchedulingHolidayData[]> {
    const rows = await this.prisma.schedulingHoliday.findMany({ orderBy: { date: 'asc' } });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      date: row.date,
      policy: TO_DOMAIN_POLICY[row.policy],
    }));
  }

  async addHoliday(holiday: SchedulingHolidayData): Promise<void> {
    await this.prisma.schedulingHoliday.create({
      data: {
        id: holiday.id,
        name: holiday.name,
        date: holiday.date,
        policy: TO_PERSISTENCE_POLICY[holiday.policy],
      },
    });
  }

  async removeHoliday(id: string): Promise<void> {
    await this.prisma.schedulingHoliday.deleteMany({ where: { id } });
  }
}
