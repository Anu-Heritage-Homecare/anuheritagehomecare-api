import { Payslip } from '../../domain/payslip.entity';

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/** One payslip in the caregiver's payroll history list. */
export interface PayslipSummaryResult {
  id: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  payDay: string;
  netMinor: number;
}

/** A full payslip: the period, the hours worked and the priced breakdown. */
export interface PayslipDetailResult {
  id: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  payDay: string;
  workedHours: number;
  breakdown: {
    regularHours: number;
    regularPayMinor: number;
    overtimeHours: number;
    overtimePayMinor: number;
    weekendVisits: number;
    weekendBonusMinor: number;
    grossMinor: number;
    deductionsMinor: number;
    netMinor: number;
  };
}

export function toPayslipSummary(payslip: Payslip): PayslipSummaryResult {
  return {
    id: payslip.id,
    currency: String(payslip.currency),
    periodStart: toIsoDate(payslip.periodStart),
    periodEnd: toIsoDate(payslip.periodEnd),
    payDay: toIsoDate(payslip.payDay),
    netMinor: payslip.breakdown.netMinor,
  };
}

export function toPayslipDetail(payslip: Payslip): PayslipDetailResult {
  const b = payslip.breakdown;
  return {
    id: payslip.id,
    currency: String(payslip.currency),
    periodStart: toIsoDate(payslip.periodStart),
    periodEnd: toIsoDate(payslip.periodEnd),
    payDay: toIsoDate(payslip.payDay),
    workedHours: minutesToHours(payslip.workedMinutes),
    breakdown: {
      regularHours: minutesToHours(b.regularMinutes),
      regularPayMinor: b.regularPayMinor,
      overtimeHours: minutesToHours(b.overtimeMinutes),
      overtimePayMinor: b.overtimePayMinor,
      weekendVisits: b.weekendVisits,
      weekendBonusMinor: b.weekendBonusMinor,
      grossMinor: b.grossMinor,
      deductionsMinor: b.deductionsMinor,
      netMinor: b.netMinor,
    },
  };
}
