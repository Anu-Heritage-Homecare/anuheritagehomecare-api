import { VisitFormat } from './visit-format.entity';

/** Persistence port for visit formats and their per currency rates. */
export interface VisitFormatRepository {
  list(): Promise<VisitFormat[]>;
  findById(id: string): Promise<VisitFormat | null>;
  save(format: VisitFormat): Promise<void>;
  delete(id: string): Promise<void>;
}

export const VISIT_FORMAT_REPOSITORY = Symbol('VISIT_FORMAT_REPOSITORY');
