/**
 * The administrative action taken on the archive/discharge screen: a reversible
 * temporary hold, or a full formal discharge that closes the engagement.
 */
export enum DischargeAction {
  Hold = 'HOLD',
  Discharge = 'DISCHARGE',
}

/** Every valid action, used to validate incoming values at the boundary. */
export const ALL_DISCHARGE_ACTIONS: readonly DischargeAction[] = Object.values(DischargeAction);
