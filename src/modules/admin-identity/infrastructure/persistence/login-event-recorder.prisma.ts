import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  LoginEventRecord,
  LoginEventRecorder,
} from '../../application/ports/login-event-recorder.port';

/** Prisma adapter that appends an admin login attempt to the audit trail. */
@Injectable()
export class LoginEventRecorderPrisma implements LoginEventRecorder {
  constructor(private readonly prisma: PrismaService) {}

  async record(event: LoginEventRecord): Promise<void> {
    await this.prisma.adminLoginEvent.create({
      data: {
        adminUserId: event.adminUserId,
        email: event.email,
        operatorName: event.operatorName,
        outcome: event.outcome,
        ipAddress: event.ipAddress,
        deviceLabel: event.deviceLabel,
      },
    });
  }
}
