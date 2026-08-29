import {
  AdditionalCareRequest as PrismaRow,
  CareRequestStatus as PrismaStatus,
} from '@prisma/client';
import { AdditionalCareRequest } from '../../domain/additional-care-request.entity';
import { CareRequestStatus } from '../../domain/care-request-status.enum';

/** Translates between the AdditionalCareRequest aggregate and its Prisma row. */
export class AdditionalCareRequestMapper {
  static toDomain(row: PrismaRow): AdditionalCareRequest {
    return AdditionalCareRequest.rehydrate(row.id, {
      ownerId: row.ownerId,
      careRecipientId: row.careRecipientId,
      careType: row.careType,
      requestedDate: row.requestedDate,
      startMinute: row.startMinute,
      durationMinutes: row.durationMinutes,
      reason: row.reason,
      status: AdditionalCareRequestMapper.TO_DOMAIN_STATUS[row.status],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(request: AdditionalCareRequest): PrismaRow {
    return {
      id: request.id,
      ownerId: request.ownerId,
      careRecipientId: request.careRecipientId,
      careType: request.careType,
      requestedDate: request.requestedDate,
      startMinute: request.startMinute,
      durationMinutes: request.durationMinutes,
      reason: request.reason,
      status: AdditionalCareRequestMapper.TO_PERSISTENCE_STATUS[request.status],
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  private static readonly TO_DOMAIN_STATUS: Record<PrismaStatus, CareRequestStatus> = {
    PENDING: CareRequestStatus.Pending,
    APPROVED: CareRequestStatus.Approved,
    DECLINED: CareRequestStatus.Declined,
    CANCELLED: CareRequestStatus.Cancelled,
  };

  private static readonly TO_PERSISTENCE_STATUS: Record<CareRequestStatus, PrismaStatus> = {
    [CareRequestStatus.Pending]: 'PENDING',
    [CareRequestStatus.Approved]: 'APPROVED',
    [CareRequestStatus.Declined]: 'DECLINED',
    [CareRequestStatus.Cancelled]: 'CANCELLED',
  };
}
