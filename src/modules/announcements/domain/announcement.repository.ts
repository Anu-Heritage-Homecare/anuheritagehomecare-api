import { Announcement } from './announcement.entity';

/** Persistence port for announcements. */
export interface AnnouncementRepository {
  save(announcement: Announcement): Promise<void>;
  findById(id: string): Promise<Announcement | null>;
}

export const ANNOUNCEMENT_REPOSITORY = Symbol('ANNOUNCEMENT_REPOSITORY');
