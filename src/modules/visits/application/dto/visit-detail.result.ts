import { VisitStatus } from '../../domain/visit-status.enum';

/** The full appointment detail a caregiver sees when opening a visit. */
export interface VisitDetailResult {
  id: string;
  status: VisitStatus;
  date: string;
  startMinute: number;
  endMinute: number;
  clockInAt: string | null;
  clockOutAt: string | null;
  address: string;
  recipient: {
    id: string;
    name: string;
    gender: string;
    age: number;
    photoKey: string | null;
  };
  tasks: { label: string; completed: boolean }[];
  specialInstructions: string[];
  healthNote: {
    medicalConditions: string[];
    allergies: string[];
  };
  emergencyContact: {
    name: string;
    phone: string;
  } | null;
}
