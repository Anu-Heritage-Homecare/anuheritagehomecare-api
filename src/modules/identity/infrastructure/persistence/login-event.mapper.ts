import { LoginEvent as PrismaLoginEvent, LoginOutcome as PrismaLoginOutcome } from '@prisma/client';
import { LoginEvent, LoginOutcome } from '../../domain/login-event.entity';

const TO_DOMAIN_OUTCOME: Record<PrismaLoginOutcome, LoginOutcome> = {
  SUCCESS: LoginOutcome.Success,
  FAILURE: LoginOutcome.Failure,
};
const TO_PERSISTENCE_OUTCOME: Record<LoginOutcome, PrismaLoginOutcome> = {
  [LoginOutcome.Success]: 'SUCCESS',
  [LoginOutcome.Failure]: 'FAILURE',
};

/** Translates between the Prisma login event row and the domain entity. */
export class LoginEventMapper {
  static toDomain(row: PrismaLoginEvent): LoginEvent {
    return LoginEvent.rehydrate(row.id, {
      userId: row.userId,
      outcome: TO_DOMAIN_OUTCOME[row.outcome],
      deviceLabel: row.deviceLabel,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt,
    });
  }

  static toPersistence(event: LoginEvent): PrismaLoginEvent {
    return {
      id: event.id,
      userId: event.userId,
      outcome: TO_PERSISTENCE_OUTCOME[event.outcome],
      deviceLabel: event.deviceLabel,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      createdAt: event.createdAt,
    };
  }
}
