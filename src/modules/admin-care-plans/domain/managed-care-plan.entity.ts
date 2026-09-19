import { BillingModel } from '@modules/care-plans/domain/billing-model.enum';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { BillingCycle } from './billing-cycle.enum';
import { ManagedPlanStatus } from './managed-plan-status.enum';

/** One service line included in a plan, with its toggle. */
export interface ServiceItem {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
}

/** A volume discount tier: a percentage off above an hours threshold. */
export interface VolumeDiscount {
  thresholdHours: number;
  percentBps: number;
}

/** The per currency pricing structure of a plan. */
export interface ManagedPlanPriceEntry {
  currency: Currency;
  monthlyPriceMinor: number | null;
  baseRateMinor: number | null;
  emergencyDispatchRateMinor: number | null;
  weekendPremiumMinor: number | null;
}

/** One recorded revision of a plan, for the Version History tab. */
export interface PlanVersionEntry {
  versionNumber: number;
  summary: string;
  changedByAdminId: string | null;
  createdAt: Date;
}

/** The editable general overview of a plan. */
export interface PlanOverview {
  name: string;
  description: string;
  targetAudience: string | null;
  billingModel: BillingModel;
  countriesEnabled: string[];
  supportedCurrencies: Currency[];
  minimumBillingHours: number | null;
}

/** The renewal and billing lifecycle rules of a plan. */
export interface PlanLifecycle {
  autoRenewal: boolean;
  billingCycle: BillingCycle;
  gracePeriodDays: number;
  cancellationNoticeDays: number;
}

interface ManagedCarePlanProps {
  coreType: CarePlanType | null;
  isCore: boolean;
  name: string;
  description: string;
  targetAudience: string | null;
  billingModel: BillingModel;
  status: ManagedPlanStatus;
  countriesEnabled: string[];
  supportedCurrencies: Currency[];
  minimumBillingHours: number | null;
  autoRenewal: boolean;
  billingCycle: BillingCycle;
  gracePeriodDays: number;
  cancellationNoticeDays: number;
  currentVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ManagedCarePlanChildren {
  prices: ManagedPlanPriceEntry[];
  services: ServiceItem[];
  volumeDiscounts: VolumeDiscount[];
  coverageAreas: string[];
  eligibilityRules: string[];
  versions: PlanVersionEntry[];
}

const ALLOWED_COUNTRIES = new Set(['US', 'NG']);
const MAX_NAME = 120;
const MAX_DESCRIPTION = 500;

/**
 * A care plan in the admin management catalogue. A core plan is linked to one of the
 * four canonical plan types that checkout uses; a custom plan has no such link and
 * is not wired into booking or checkout yet. The aggregate owns the full editable
 * configuration and records a version entry on every revision.
 */
export class ManagedCarePlan extends AggregateRoot<string> {
  private props: ManagedCarePlanProps;
  private prices: ManagedPlanPriceEntry[];
  private services: ServiceItem[];
  private volumeDiscounts: VolumeDiscount[];
  private coverageAreas: string[];
  private eligibilityRules: string[];
  private readonly versions: PlanVersionEntry[];
  private readonly pendingVersions: PlanVersionEntry[] = [];

  private constructor(id: string, props: ManagedCarePlanProps, children: ManagedCarePlanChildren) {
    super(id);
    this.props = props;
    this.prices = children.prices;
    this.services = children.services;
    this.volumeDiscounts = children.volumeDiscounts;
    this.coverageAreas = children.coverageAreas;
    this.eligibilityRules = children.eligibilityRules;
    this.versions = children.versions;
  }

  public static create(params: {
    id: string;
    coreType?: CarePlanType | null;
    overview: PlanOverview;
    lifecycle: PlanLifecycle;
    prices?: ManagedPlanPriceEntry[];
    services?: ServiceItem[];
    volumeDiscounts?: VolumeDiscount[];
    coverageAreas?: string[];
    eligibilityRules?: string[];
    createdByAdminId?: string | null;
    now: Date;
  }): ManagedCarePlan {
    const overview = normaliseOverview(params.overview);
    const lifecycle = normaliseLifecycle(params.lifecycle);
    const coreType = params.coreType ?? null;

    const plan = new ManagedCarePlan(
      params.id,
      {
        coreType,
        isCore: coreType !== null,
        name: overview.name,
        description: overview.description,
        targetAudience: overview.targetAudience,
        billingModel: overview.billingModel,
        status: ManagedPlanStatus.Active,
        countriesEnabled: overview.countriesEnabled,
        supportedCurrencies: overview.supportedCurrencies,
        minimumBillingHours: overview.minimumBillingHours,
        autoRenewal: lifecycle.autoRenewal,
        billingCycle: lifecycle.billingCycle,
        gracePeriodDays: lifecycle.gracePeriodDays,
        cancellationNoticeDays: lifecycle.cancellationNoticeDays,
        currentVersion: 0,
        createdAt: params.now,
        updatedAt: params.now,
      },
      {
        prices: params.prices ?? [],
        services: params.services ?? [],
        volumeDiscounts: params.volumeDiscounts ?? [],
        coverageAreas: params.coverageAreas ?? [],
        eligibilityRules: params.eligibilityRules ?? [],
        versions: [],
      },
    );
    plan.recordVersion('Plan created', params.createdByAdminId ?? null, params.now);
    return plan;
  }

  public static rehydrate(
    id: string,
    props: ManagedCarePlanProps,
    children: ManagedCarePlanChildren,
  ): ManagedCarePlan {
    return new ManagedCarePlan(id, props, children);
  }

  public reviseOverview(overview: PlanOverview, adminId: string | null, now: Date): void {
    const clean = normaliseOverview(overview);
    this.props.name = clean.name;
    this.props.description = clean.description;
    this.props.targetAudience = clean.targetAudience;
    this.props.billingModel = clean.billingModel;
    this.props.countriesEnabled = clean.countriesEnabled;
    this.props.supportedCurrencies = clean.supportedCurrencies;
    this.props.minimumBillingHours = clean.minimumBillingHours;
    this.recordVersion('General details updated', adminId, now);
  }

  public revisePricing(prices: ManagedPlanPriceEntry[], adminId: string | null, now: Date): void {
    this.prices = prices.map((price) => ({ ...price }));
    this.recordVersion('Pricing updated', adminId, now);
  }

  public setServices(services: ServiceItem[], adminId: string | null, now: Date): void {
    this.services = services.map((service) => ({
      ...service,
      key: service.key.trim(),
      name: service.name.trim(),
    }));
    this.recordVersion('Services updated', adminId, now);
  }

  public setVolumeDiscounts(discounts: VolumeDiscount[], adminId: string | null, now: Date): void {
    for (const discount of discounts) {
      if (discount.thresholdHours < 0 || discount.percentBps < 0 || discount.percentBps > 10_000) {
        throw new ValidationException('A volume discount is out of range');
      }
    }
    this.volumeDiscounts = discounts.map((discount) => ({ ...discount }));
    this.recordVersion('Volume discounts updated', adminId, now);
  }

  public setCoverageAreas(areas: string[], adminId: string | null, now: Date): void {
    this.coverageAreas = dedupeTrimmed(areas);
    this.recordVersion('Coverage areas updated', adminId, now);
  }

  public setEligibilityRules(rules: string[], adminId: string | null, now: Date): void {
    this.eligibilityRules = dedupeTrimmed(rules);
    this.recordVersion('Eligibility rules updated', adminId, now);
  }

  public reviseLifecycle(lifecycle: PlanLifecycle, adminId: string | null, now: Date): void {
    const clean = normaliseLifecycle(lifecycle);
    this.props.autoRenewal = clean.autoRenewal;
    this.props.billingCycle = clean.billingCycle;
    this.props.gracePeriodDays = clean.gracePeriodDays;
    this.props.cancellationNoticeDays = clean.cancellationNoticeDays;
    this.recordVersion('Renewal and billing rules updated', adminId, now);
  }

  public archive(adminId: string | null, now: Date): void {
    if (this.props.status === ManagedPlanStatus.Archived) {
      throw new ValidationException('The plan is already archived');
    }
    this.props.status = ManagedPlanStatus.Archived;
    this.recordVersion('Plan archived', adminId, now);
  }

  public activate(adminId: string | null, now: Date): void {
    if (this.props.status === ManagedPlanStatus.Active) {
      throw new ValidationException('The plan is already active');
    }
    this.props.status = ManagedPlanStatus.Active;
    this.recordVersion('Plan reactivated', adminId, now);
  }

  private recordVersion(summary: string, adminId: string | null, now: Date): void {
    this.props.currentVersion += 1;
    const entry: PlanVersionEntry = {
      versionNumber: this.props.currentVersion,
      summary,
      changedByAdminId: adminId,
      createdAt: now,
    };
    this.versions.push(entry);
    this.pendingVersions.push(entry);
    this.props.updatedAt = now;
  }

  /** Version entries recorded since the aggregate was loaded, for persistence. */
  public pullPendingVersions(): PlanVersionEntry[] {
    const entries = [...this.pendingVersions];
    this.pendingVersions.length = 0;
    return entries;
  }

  public get coreType(): CarePlanType | null {
    return this.props.coreType;
  }

  public get isCore(): boolean {
    return this.props.isCore;
  }

  public get name(): string {
    return this.props.name;
  }

  public get description(): string {
    return this.props.description;
  }

  public get targetAudience(): string | null {
    return this.props.targetAudience;
  }

  public get billingModel(): BillingModel {
    return this.props.billingModel;
  }

  public get status(): ManagedPlanStatus {
    return this.props.status;
  }

  public get countriesEnabled(): string[] {
    return [...this.props.countriesEnabled];
  }

  public get supportedCurrencies(): Currency[] {
    return [...this.props.supportedCurrencies];
  }

  public get minimumBillingHours(): number | null {
    return this.props.minimumBillingHours;
  }

  public get lifecycle(): PlanLifecycle {
    return {
      autoRenewal: this.props.autoRenewal,
      billingCycle: this.props.billingCycle,
      gracePeriodDays: this.props.gracePeriodDays,
      cancellationNoticeDays: this.props.cancellationNoticeDays,
    };
  }

  public get currentVersion(): number {
    return this.props.currentVersion;
  }

  public get pricing(): ManagedPlanPriceEntry[] {
    return this.prices.map((price) => ({ ...price }));
  }

  public get includedServices(): ServiceItem[] {
    return this.services.map((service) => ({ ...service }));
  }

  public get discounts(): VolumeDiscount[] {
    return this.volumeDiscounts.map((discount) => ({ ...discount }));
  }

  public get coverage(): string[] {
    return [...this.coverageAreas];
  }

  public get eligibility(): string[] {
    return [...this.eligibilityRules];
  }

  public get versionHistory(): PlanVersionEntry[] {
    return [...this.versions];
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}

function normaliseOverview(overview: PlanOverview): PlanOverview {
  const name = overview.name.trim();
  if (name.length === 0 || name.length > MAX_NAME) {
    throw new ValidationException('A plan name is required and must be within the length limit');
  }
  const description = overview.description.trim();
  if (description.length > MAX_DESCRIPTION) {
    throw new ValidationException('The plan description exceeds the maximum length');
  }
  const countries = dedupeTrimmed(overview.countriesEnabled).map((code) => code.toUpperCase());
  for (const country of countries) {
    if (!ALLOWED_COUNTRIES.has(country)) {
      throw new ValidationException(`Unsupported country ${country}`);
    }
  }
  if (overview.minimumBillingHours !== null) {
    if (!Number.isInteger(overview.minimumBillingHours) || overview.minimumBillingHours < 0) {
      throw new ValidationException('Minimum billing hours must be a non negative integer');
    }
  }
  return {
    name,
    description,
    targetAudience: cleanOptional(overview.targetAudience),
    billingModel: overview.billingModel,
    countriesEnabled: countries,
    supportedCurrencies: [...new Set(overview.supportedCurrencies)],
    minimumBillingHours: overview.minimumBillingHours,
  };
}

function normaliseLifecycle(lifecycle: PlanLifecycle): PlanLifecycle {
  if (lifecycle.gracePeriodDays < 0 || lifecycle.cancellationNoticeDays < 0) {
    throw new ValidationException('Grace and cancellation notice periods cannot be negative');
  }
  return {
    autoRenewal: lifecycle.autoRenewal,
    billingCycle: lifecycle.billingCycle,
    gracePeriodDays: Math.trunc(lifecycle.gracePeriodDays),
    cancellationNoticeDays: Math.trunc(lifecycle.cancellationNoticeDays),
  };
}

function cleanOptional(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function dedupeTrimmed(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}
