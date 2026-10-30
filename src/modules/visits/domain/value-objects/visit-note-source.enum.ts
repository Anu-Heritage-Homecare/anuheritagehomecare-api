/**
 * Who authored a visit note: a caregiver (during the shift), an office coordinator
 * (an admin reviewing the visit) or the system (an automated entry). Drives the
 * admin Notes tab pills and badges. Independent of the Prisma enum.
 */
export enum VisitNoteSource {
  Caregiver = 'CAREGIVER',
  Coordinator = 'COORDINATOR',
  System = 'SYSTEM',
}
