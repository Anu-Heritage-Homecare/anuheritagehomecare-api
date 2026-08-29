/**
 * Who a visit note is written for: the internal care team, or the family. A
 * family owner sees the notes on the visit detail; the audience distinguishes an
 * internal note from one addressed to the family.
 */
export enum NoteAudience {
  CareTeam = 'CARE_TEAM',
  Family = 'FAMILY',
}
