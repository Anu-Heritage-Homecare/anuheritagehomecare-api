import { SosAlert as PrismaSosAlert, SosAlertStatus as PrismaSosAlertStatus } from '@prisma/client';
import { Coordinates } from '@shared/domain/coordinates.vo';
import { SosAlert } from '../../domain/sos-alert.entity';
import { SosAlertStatus } from '../../domain/sos-alert-status.enum';

/**
 * Translates a SosAlert entity to and from its Prisma row. The only place that
 * knows both shapes, so the domain stays free of Prisma types.
 */
export class SosAlertMapper {
  static toPersistence(alert: SosAlert): PrismaSosAlert {
    return {
      id: alert.id,
      caregiverId: alert.caregiverId,
      visitId: alert.visitId,
      latitude: alert.position?.latitude ?? null,
      longitude: alert.position?.longitude ?? null,
      careRecipientId: alert.recipient.careRecipientId,
      recipientName: alert.recipient.name,
      recipientAddress: alert.recipient.address,
      recipientLatitude: alert.recipient.location?.latitude ?? null,
      recipientLongitude: alert.recipient.location?.longitude ?? null,
      status: SosAlertMapper.TO_PERSISTENCE_STATUS[alert.status],
      cancelledAt: alert.cancelledAt,
      createdAt: alert.createdAt,
    };
  }

  static toDomain(row: PrismaSosAlert): SosAlert {
    const position =
      row.latitude === null || row.longitude === null
        ? null
        : Coordinates.create(row.latitude, row.longitude);
    const recipientLocation =
      row.recipientLatitude === null || row.recipientLongitude === null
        ? null
        : Coordinates.create(row.recipientLatitude, row.recipientLongitude);

    return SosAlert.rehydrate(row.id, {
      caregiverId: row.caregiverId,
      visitId: row.visitId,
      position,
      recipient: {
        careRecipientId: row.careRecipientId,
        name: row.recipientName,
        address: row.recipientAddress,
        location: recipientLocation,
      },
      status: SosAlertMapper.TO_DOMAIN_STATUS[row.status],
      cancelledAt: row.cancelledAt,
      createdAt: row.createdAt,
    });
  }

  private static readonly TO_DOMAIN_STATUS: Record<PrismaSosAlertStatus, SosAlertStatus> = {
    ACTIVE: SosAlertStatus.Active,
    CANCELLED: SosAlertStatus.Cancelled,
  };

  private static readonly TO_PERSISTENCE_STATUS: Record<SosAlertStatus, PrismaSosAlertStatus> = {
    [SosAlertStatus.Active]: 'ACTIVE',
    [SosAlertStatus.Cancelled]: 'CANCELLED',
  };
}
