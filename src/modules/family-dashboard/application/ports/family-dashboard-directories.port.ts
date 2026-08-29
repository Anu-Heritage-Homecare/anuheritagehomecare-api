/**
 * Read ports the family owner dashboard depends on, one per bounded context it
 * composes. Each returns a plain view (never a foreign aggregate), so the use
 * case depends only on these abstractions; the adapters in infrastructure map
 * from the care recipients, visits and identity contexts.
 */

/** One medication on a recipient's schedule, enough to label an activity event. */
export interface DashboardMedicationView {
  id: string;
  name: string;
}

/** A care recipient the owner has, as the dashboard needs it. */
export interface DashboardRecipientView {
  id: string;
  ownerId: string;
  name: string;
  gender: string;
  dateOfBirth: Date;
  photoKey: string | null;
  medications: DashboardMedicationView[];
}

export interface FamilyRecipientDirectory {
  /** The owner's active care recipients (drafts still onboarding are excluded). */
  listActiveForOwner(ownerId: string): Promise<DashboardRecipientView[]>;
}

export const FAMILY_RECIPIENT_DIRECTORY = Symbol('FAMILY_RECIPIENT_DIRECTORY');

export interface DashboardTaskView {
  label: string;
  completed: boolean;
  completedAt: Date | null;
}

export interface DashboardMedicationEventView {
  medicationId: string;
  outcome: string;
  recordedAt: Date;
}

export interface DashboardVitalsEventView {
  hasBloodPressure: boolean;
  recordedAt: Date;
}

/** A visit and its recorded activity, as the dashboard needs it. */
export interface DashboardVisitView {
  id: string;
  careRecipientId: string;
  caregiverId: string;
  status: string;
  startMinute: number;
  endMinute: number;
  clockInAt: Date | null;
  clockOutAt: Date | null;
  tasks: DashboardTaskView[];
  medicationEvents: DashboardMedicationEventView[];
  vitalsEvents: DashboardVitalsEventView[];
}

export interface FamilyVisitDirectory {
  /** The day's visits for the given recipients, in one query (no query per one). */
  listForRecipientsOnDay(
    careRecipientIds: string[],
    from: Date,
    to: Date,
  ): Promise<DashboardVisitView[]>;
}

export const FAMILY_VISIT_DIRECTORY = Symbol('FAMILY_VISIT_DIRECTORY');

/** A user (the owner, or an assigned caregiver), by name. */
export interface DashboardUserView {
  id: string;
  firstName: string;
  lastName: string;
}

export interface FamilyUserDirectory {
  findByIds(ids: string[]): Promise<Map<string, DashboardUserView>>;
}

export const FAMILY_USER_DIRECTORY = Symbol('FAMILY_USER_DIRECTORY');
