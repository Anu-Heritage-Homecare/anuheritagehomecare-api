/**
 * Command to start a care recipient onboarding draft with the identity profile
 * captured on the first wizard step. `ownerId` is the authenticated family owner
 * and is supplied by the presentation layer, never by the client body.
 */
export interface CreateCareRecipientDraftCommand {
  ownerId: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  city: string;
  state: string;
  fullAddress: string;
  relationship: string;
  livingSituation: string;
  photoKey?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}
