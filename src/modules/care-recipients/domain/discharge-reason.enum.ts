/**
 * The reason a care engagement is ended or paused, from the Discharge Reason
 * dropdown. Covers both the discharge reasons (care no longer needed, a residential
 * transition, relocation, deceased) and the common hold reasons (hospitalization,
 * family travel, a temporary out of area arrangement).
 */
export enum DischargeReason {
  CareNoLongerNeeded = 'CARE_NO_LONGER_NEEDED',
  ResidentialFacilityTransition = 'RESIDENTIAL_FACILITY_TRANSITION',
  RelocationOutOfCoverage = 'RELOCATION_OUT_OF_COVERAGE',
  Deceased = 'DECEASED',
  Hospitalization = 'HOSPITALIZATION',
  FamilyTravel = 'FAMILY_TRAVEL',
  TemporaryRelocation = 'TEMPORARY_RELOCATION',
  Other = 'OTHER',
}

/** Every valid reason, used to validate incoming values at the boundary. */
export const ALL_DISCHARGE_REASONS: readonly DischargeReason[] = Object.values(DischargeReason);
